import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI } from "@google/genai";

interface GeminiError {
  status?: number;
  message?: string;
  code?: number;
}

const PRIMARY_MODEL = "gemini-3-flash-preview";
const FALLBACK_MODELS = ["gemini-flash-latest", "gemini-3.1-flash-lite", "gemini-3-pro-preview"];

// Simple promise-based queue to limit concurrency to 1 request at a time
let requestQueue: Promise<void> = Promise.resolve();

// Cooldowns for models hitting 429/503 to avoid immediate retries on the same model
const modelCooldowns: Record<string, number> = {};

function isModelOnCooldown(model: string): boolean {
  const cooldown = modelCooldowns[model];
  if (!cooldown) return false;
  if (Date.now() > cooldown) {
    delete modelCooldowns[model];
    return false;
  }
  return true;
}

function setModelCooldown(model: string, durationMs: number = 30000) {
  modelCooldowns[model] = Date.now() + durationMs;
}

async function performGeneration(ai: GoogleGenAI, prompt: string, modelIndex: number = -1): Promise<string> {
  const modelToUse = modelIndex === -1 ? PRIMARY_MODEL : FALLBACK_MODELS[modelIndex];
  
  // If model is on cooldown and we have fallbacks, move to next model immediately
  if (isModelOnCooldown(modelToUse) && modelIndex < FALLBACK_MODELS.length - 1) {
    console.warn(`Model ${modelToUse} is on cooldown, skipping to next fallback.`);
    return performGeneration(ai, prompt, modelIndex + 1);
  }

  const maxRetries = 3; // Reduced individual model retries to fail over faster
  let lastError: unknown = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: modelToUse,
        contents: prompt,
      });
      return response.text?.trim() || "No response generated.";
    } catch (error: unknown) {
      lastError = error;
      const err = error as GeminiError;
      const errStr = JSON.stringify(err);
      
      const isQuotaError = 
        err?.status === 429 || err?.code === 429 || 
        errStr.includes('429') || 
        errStr.toLowerCase().includes('quota') ||
        errStr.toLowerCase().includes('too many requests');

      const isServiceUnavailable = 
        err?.status === 503 || err?.code === 503 ||
        errStr.includes('503') ||
        errStr.toLowerCase().includes('high demand') ||
        errStr.toLowerCase().includes('unavailable');

      const isRetryable = 
        isQuotaError ||
        isServiceUnavailable ||
        errStr.toLowerCase().includes('deadline exceeded');

      if (isRetryable) {
        // If it's a quota or service error and we have a fallback, fail over immediately
        if (isQuotaError || isServiceUnavailable) {
          const reason = isQuotaError ? "QUOTA EXCEEDED" : "SERVICE UNAVAILABLE";
          console.error(`${reason} for ${modelToUse}. Entering 60s cooldown.`);
          setModelCooldown(modelToUse, 60000);
          
          if (modelIndex < FALLBACK_MODELS.length - 1) {
            console.warn(`Failover: Model ${modelToUse} is ${reason.toLowerCase()}. Trying next fallback model immediately.`);
            return performGeneration(ai, prompt, modelIndex + 1);
          }
        }

        // 5s, 10s backoff for other retryable errors or if no fallbacks left
        const delay = Math.pow(2, attempt) * 5000 + Math.random() * 2000;
        console.warn(`Retryable error with ${modelToUse} (attempt ${attempt + 1}/${maxRetries}). Retrying in ${Math.round(delay)}ms. Error: ${errStr}`);
        await new Promise(res => setTimeout(res, delay));
        
        if (attempt === maxRetries - 1 && modelIndex < FALLBACK_MODELS.length - 1) {
          return performGeneration(ai, prompt, modelIndex + 1);
        }
        continue;
      }
      throw error;
    }
  }
  throw lastError || new Error(`Failed after ${maxRetries} attempts.`);
}

async function generateWithFallback(ai: GoogleGenAI, prompt: string): Promise<string> {
  // Add this request to the queue chain to serialize AI calls
  const result = new Promise<string>((resolve, reject) => {
    requestQueue = requestQueue.then(async () => {
      try {
        const text = await performGeneration(ai, prompt);
        // Small mandatory delay between successful requests to respect rate limits
        await new Promise(res => setTimeout(res, 1500));
        resolve(text);
      } catch (err) {
        reject(err);
      }
    }).catch(err => {
      console.error("Queue execution error:", err);
    });
  });
  return result;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Gemini
  const apiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;
  
  if (apiKey) {
    try {
      ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      console.log("Gemini SDK initialized successfully");
    } catch (e) {
      console.error("Failed to initialize Gemini SDK:", e);
    }
  } else {
    console.warn("GEMINI_API_KEY is not set in the environment.");
  }

  // Middleware for parsing JSON
  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    console.log("Health check request received");
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      hasApiKey: !!apiKey,
      aiInitialized: !!ai
    });
  });

  app.post("/api/gemini/daily", async (req, res) => {
    console.log("Gemini Daily Insight request received");
    if (!ai) {
      return res.status(500).json({ error: "Gemini API is not configured" });
    }
    const { profile, sleep, meals, move } = req.body;
    
    // Check if there's any data at all
    const hasData = sleep || meals.length > 0 || move.length > 0;
    
    if (!hasData) {
      return res.json({ text: "Your loop is empty today! Log your sleep, meals, or activity to see your first daily insight." });
    }

    const prompt = `
      You are "SihatLoop AI", a hyper-personalized health coach for SihatLoop.
      
      USER CONTEXT:
      - Profile Goals: ${JSON.stringify(profile)}
      - Recent Sleep Session: ${sleep ? JSON.stringify(sleep) : "Not logged yet"} (Fields: bedtime, wakeTime, hoursSlept, moodRating)
      - Today's Meals: ${meals.length > 0 ? JSON.stringify(meals) : "None yet"} (Fields: mealSlot, overallHealthRating, proteinGrams, fatGrams, fiberGrams)
      - Today's Activity: ${move.length > 0 ? JSON.stringify(move) : "None yet"} (Fields: activityName, intensity, durationMinutes, moodRating, energyLevel)

      TASK: Provide a single, actionable "Loop Insight" (max 200 characters).
      
      STRICT ANALYTICAL GUIDELINES:
      1. CORRELATION REVEAL: Connect today's data points. E.g., "Your high-intensity Move session usually bumps your Sleep session mood – log it today to confirm!" or "That 'snack' slot meal might be affecting your next activity intensity."
      2. DATA-SPECIFIC ACTION: If a goal is missed (e.g., missed Move target), suggest an immediate recovery move based on current mood or energy.
      3. LOGGING TRIGGER: Use gaps in logging as a tool. "Log your dinner to see if your Move energy level holds up tomorrow morning."
      4. NO FILLER: Start immediately with the insight. No "I see that..." or "Based on...".

      Tone: Wise, slightly technical, highly specific.
    `;

    try {
      const text = await generateWithFallback(ai, prompt);
      res.json({ text });
    } catch (error: unknown) {
      const err = error as GeminiError;
      const errStr = JSON.stringify(err);
      console.error("Gemini Daily Insight Error:", err);
      const isCapacityError = 
        err?.status === 429 || err?.code === 429 || 
        err?.status === 503 || err?.code === 503 ||
        err?.message?.includes('429') || err?.message?.includes('503') ||
        errStr.toLowerCase().includes('quota') || errStr.toLowerCase().includes('demand');

      if (isCapacityError) {
        return res.json({ text: "AI is currently resting to save energy! Your daily insight will return shortly. Keep looping!" });
      }
      res.status(500).json({ error: "Failed to generate daily insight" });
    }
  });

  app.post("/api/gemini/insight", async (req, res) => {
    console.log("Gemini Insight request received");
    if (!ai) {
      return res.status(500).json({ error: "Gemini API is not configured" });
    }
    const { profile, sleep, meals, move } = req.body;
    const prompt = `
      You are an expert health pattern analyst for SihatLoop.
      
      DATA SET (Last 7 Days):
      - User Goals: ${JSON.stringify(profile)}
      - Sleep: ${JSON.stringify(sleep)}
      - Meals: ${JSON.stringify(meals)}
      - Move: ${JSON.stringify(move)}

      TASK: Write a "Weekly Loop Insight" in Markdown. 
      Focus on revealing hidden correlations between these data points.
      
      REQUIRED ANALYSIS:
      1. **Sleep-Mood Link**: Analyze correlation between sleep session consistency or weight/height factors and the waking moodRating. Does 7h vs 8h sleep change the mood specifically for this user?
      2. **Meal-Energy Link**: How do mealSlot timings and overallHealthRating of meals impact the energyLevel reported in subsequent ActivityLogs?
      3. **Activity-Recovery Link**: Relationship between activity intensity/duration and the subsequent SleepLog hoursSlept or moodRating. Does 'hard' intensity lead to better sleep sessions?

      STRUCTURE:
      1. **Weekly Breakthrough**: One specific data-backed win (e.g. "You're 15% more consistent with sleep timing on days you log a 'hard' intensity Move").
      2. **The Friction Point**: One specific correlation explaining a goal shortfall.
      3. **Strategic Pivot**: One highly specific, measurable habit change for next week.

      Tone: Data-driven, blunt but encouraging. Max 800 characters.
    `;

    try {
      const text = await generateWithFallback(ai, prompt);
      res.json({ text });
    } catch (error: unknown) {
      const err = error as GeminiError;
      const errStr = JSON.stringify(err);
      console.error("Gemini Insight Error:", err);
      const isCapacityError = 
        err?.status === 429 || err?.code === 429 || 
        err?.status === 503 || err?.code === 503 ||
        err?.message?.includes('429') || err?.message?.includes('503') ||
        errStr.toLowerCase().includes('quota') || errStr.toLowerCase().includes('demand');

      if (isCapacityError) {
        return res.json({ text: "### Weekly Status: Processing...\n\nOur AI is currently at capacity. Please check back in a few minutes for your deep-dive weekly analysis!" });
      }
      res.status(500).json({ error: "Failed to generate insight" });
    }
  });

  app.post("/api/gemini/analyze", async (req, res) => {
    console.log("Gemini Analyze request received", { domain: req.body.domain });
    if (!ai) {
      console.warn("Gemini AI is not initialized for analyze");
      return res.status(500).json({ error: "Gemini API is not configured" });
    }
    const { domain, logs, profile } = req.body;
    
    let domainSpecificInstructions = "";
    if (domain === "Sleep") {
      domainSpecificInstructions = `
        - Correlation: Time of day consistency vs. moodRating.
        - Pattern: Does duration (hoursSlept) or specific timing windows predict a higher moodRating?
        - Specificity: Identifying the 'Golden Window' of sleep sessions for this user.
      `;
    } else if (domain === "Eat") {
      domainSpecificInstructions = `
        - Correlation: Meal timing (mealSlot) distribution vs. overallHealthRating.
        - Pattern: Relationship between specific mealSlot ratings and subsequent ActivityLog energyLevels (if provided in context).
        - Advice: Precise nutritional timing based on when their energy usually dips.
      `;
    } else if (domain === "Move") {
      domainSpecificInstructions = `
        - Correlation: Relationship between activity intensity (Light/Moderate/Hard), duration, moodRating, and energyLevel.
        - Pattern: Which activityType or intensity yields the highest mood improvement?
        - Advice: Optimal duration/intensity combo to maximize post-workout energyLevel.
      `;
    }

    const prompt = `
      You are a world-class health data scientist for SihatLoop.
      DOMAIN: ${domain} loop
      USER PROFILE: ${JSON.stringify(profile)}
      HISTORICAL DATA (Last 20 entries): ${JSON.stringify(logs)}

      OBJECTIVE:
      Perform deep-dive correlation analysis between fields: ${domain === 'Sleep' ? 'bedtime, wakeTime, hoursSlept, moodRating' : domain === 'Eat' ? 'mealSlot, overallHealthRating, protein/fat/fiber' : 'intensity, durationMinutes, moodRating, energyLevel'}.
      
      CORE REQUIREMENTS:
      ${domainSpecificInstructions}
      - Use specific percentages and numbers from the logs (e.g., "Your energyLevel peaks 22% higher after morning moderate-intensity sessions").
      - CAUSAL HYPOTHESIS: Suggest *why* this reflects their unique biology or habits.
      - BLUNTNESS: If data is inconsistent, point it out as the main hurdle.

      OUTPUT STRUCTURE (Strict):
      ### Deep Analytics & Patterns
      [Concise data-driven breakdown]

      ### Optimized Loop Strategy
      1. [Measurable Action 1]
      2. [Measurable Action 2]
      3. [Measurable Action 3]
      
      Tone: Technical, clear, data-first. Max 1200 characters.
    `;

    try {
      const text = await generateWithFallback(ai, prompt);
      res.json({ text });
    } catch (error: unknown) {
      const err = error as GeminiError;
      const errStr = JSON.stringify(err);
      console.error("Gemini Analyze Error:", err);
      const isCapacityError = 
        err?.status === 429 || err?.code === 429 || 
        err?.status === 503 || err?.code === 503 ||
        err?.message?.includes('429') || err?.message?.includes('503') ||
        errStr.toLowerCase().includes('quota') || errStr.toLowerCase().includes('demand');

      if (isCapacityError) {
        return res.json({ text: "### Deep Analytics & Patterns\n\nAI Analysis is temporarily unavailable due to high demand. Please try again in a few moments to see your custom trends." });
      }
      res.status(500).json({ error: "Failed to perform analysis" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false 
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SihatSapSapSui server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
