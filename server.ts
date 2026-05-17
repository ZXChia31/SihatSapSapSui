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
const FALLBACK_MODELS = ["gemini-flash-latest", "gemini-3.1-flash-lite"];

async function generateWithFallback(ai: GoogleGenAI, prompt: string, modelIndex: number = -1): Promise<string> {
  const modelToUse = modelIndex === -1 ? PRIMARY_MODEL : FALLBACK_MODELS[modelIndex];
  
  try {
    const response = await ai.models.generateContent({
      model: modelToUse,
      contents: prompt,
    });
    return response.text?.trim() || "No response generated.";
  } catch (error: unknown) {
    const err = error as GeminiError;
    const errStr = JSON.stringify(err);
    const isRetryable = 
      err?.status === 429 || 
      err?.code === 429 || 
      err?.status === 404 ||
      err?.code === 404 ||
      errStr.includes('429') || 
      errStr.includes('404') ||
      errStr.toLowerCase().includes('quota') ||
      errStr.toLowerCase().includes('not supported') ||
      errStr.toLowerCase().includes('not found');

    if (isRetryable && modelIndex < FALLBACK_MODELS.length - 1) {
      console.warn(`Error with ${modelToUse}, trying fallback ${FALLBACK_MODELS[modelIndex + 1]}. Error: ${errStr}`);
      return generateWithFallback(ai, prompt, modelIndex + 1);
    }
    
    throw error;
  }
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
      You are the "SihatLoop AI", a hyper-personalized health coach for SihatSapSapSui.
      User Profile: ${JSON.stringify(profile)}
      Today's Data:
      - Sleep: ${sleep ? JSON.stringify(sleep) : "Not logged yet"}
      - Meals: ${meals.length > 0 ? JSON.stringify(meals) : "None logged today"}
      - Activities: ${move.length > 0 ? JSON.stringify(move) : "None logged today"}

      TASK: Provide a single, punchy, real-time "Loop Insight" (max 200 characters).
      Guidelines:
      1. SYNCHRONIZATION: If a category is missing, encourage logging it relative to what IS logged.
      2. PUNCHY: No "Based on your data...". Dive straight in.
      3. HOLISTIC: Connect the dots if possible (e.g., "Late dinner might explain the lower sleep mood rating").
      4. DO NOT BE GENERIC. If they have no meals, DO NOT give nutrition advice. Mention the activity or sleep instead.

      Tone: Wise, encouraging, slightly technical but accessible.
    `;

    try {
      const text = await generateWithFallback(ai, prompt);
      res.json({ text });
    } catch (error: unknown) {
      const err = error as GeminiError;
      console.error("Gemini Daily Insight Error:", err);
      if (err?.status === 429 || err?.code === 429 || err?.message?.includes('429') || err?.message?.toLowerCase().includes('quota')) {
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
      You are an expert health pattern analyst for SihatSapSapSui.
      User Profile: ${JSON.stringify(profile)}
      Sleep Logs (last 7d): ${JSON.stringify(sleep)}
      Meal Logs (last 7d): ${JSON.stringify(meals)}
      Activity Logs (last 7d): ${JSON.stringify(move)}

      TASK: Write a "Weekly Loop Insight" in Markdown format. 
      Structure:
      1. **The Highlight**: Identify one clear positive trend across the 3 domains.
      2. **The Growth Point**: Identify one area for improvement (e.g. erratic bedtime, low moves).
      3. **The Micro-Decision**: One extremely small, specific action for next week.

      Tone: Honest but empowering. Avoid clinical jargon. Use "we" and "you".
      Max length: 800 characters.
    `;

    try {
      const text = await generateWithFallback(ai, prompt);
      res.json({ text });
    } catch (error: unknown) {
      const err = error as GeminiError;
      console.error("Gemini Insight Error:", err);
      if (err?.status === 429 || err?.code === 429 || err?.message?.includes('429') || err?.message?.toLowerCase().includes('quota')) {
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
    const prompt = `
      You are a world-class health data scientist and behavioral specialist for the SihatLoop (SihatSapSapSui) application.
      
      DOMAIN: ${domain} loop
      CURRENT USER PROFILE DATA:
      ${JSON.stringify(profile, null, 2)}
      
      ACTUAL HISTORICAL LOGS (Last 20 entries):
      ${JSON.stringify(logs, null, 2)}

      OBJECTIVE:
      Provide a highly precise, data-driven analysis of the user's current health loop. Do NOT provide generic health advice. Your analysis must be entirely derived from the specific logs and profile data provided above.

      ANALYTICAL REQUIREMENTS:
      1. CRITICAL TRENDS: Identify at least one hidden trend or correlation (e.g., "Your sleep duration drops by 12% on nights following high-intensity Move activities").
      2. ANOMALY DETECTION: Point out a specific outlier or deviation from their stated goals.
      3. CAUSAL HYPOTHESIS: Suggest a potential reason for a specific pattern based on the data provided.
      4. PRECISION ACTION PLAN: Provide 3 actionable, measurable steps to improve their ${domain} score by 10% in the next 7 days.

      STYLE SPECIFICATIONS:
      - Be blunt, technical, and objective.
      - Use Markdown hierarchy (H3/H4).
      - Absolute NO boilerplate like "I hope this helps" or "Here is your analysis".
      - Maximum 1500 characters.

      OUTPUT STRUCTURE (Strict):
      ### Deep Analytics & Patterns
      [Your data-driven analysis here]

      ### Optimized Loop Strategy
      1. [Measurable Action 1]
      2. [Measurable Action 2]
      3. [Measurable Action 3]
    `;

    try {
      const text = await generateWithFallback(ai, prompt);
      res.json({ text });
    } catch (error: unknown) {
      const err = error as GeminiError;
      console.error("Gemini Analyze Error:", err);
      if (err?.status === 429 || err?.code === 429 || err?.message?.includes('429') || err?.message?.toLowerCase().includes('quota')) {
        return res.json({ text: "### Deep Analytics & Patterns\n\nAI Analysis is temporarily unavailable due to high demand. Please try again in a few moments to see your custom trends." });
      }
      res.status(500).json({ error: "Failed to perform analysis" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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
