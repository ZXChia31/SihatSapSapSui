import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Gemini
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // Middleware for parsing JSON
  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.post("/api/gemini/nudge", async (req, res) => {
    const { meals, profileName } = req.body;
    const prompt = `
      You are a supportive, high-energy health coach for SihatSapSapSui. 
      User Name: ${profileName}
      Recent Meals (last 24-48h): ${JSON.stringify(meals)}
      
      Instruction: Based on their recent meal ratings (protein, fat, fibre, overall), 
      generate ONE short, punchy "Nutrition Nudge" (max 150 characters). 
      Avoid generic advice. Be specific to their logged data. 
      Example: "Great protein levels for lunch! Add some fibre for dinner to keep your Eat loop strong."
      Tone: Vibrant, human, supportive.
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      res.json({ text: response.text?.trim() });
    } catch (error) {
      console.error("Gemini Nudge Error:", error);
      res.status(500).json({ error: "Failed to generate nudge" });
    }
  });

  app.post("/api/gemini/insight", async (req, res) => {
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
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      res.json({ text: response.text?.trim() });
    } catch (error) {
      console.error("Gemini Insight Error:", error);
      res.status(500).json({ error: "Failed to generate insight" });
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
