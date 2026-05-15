/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";
import { MealLog, SleepLog, ActivityLog, User } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateNutritionNudge(meals: MealLog[], profile: User) {
  const prompt = `
    You are a supportive, high-energy health coach for SihatSapSapSui. 
    User Name: ${profile.displayName}
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
    return response.text?.trim() || "Keep logging your meals to get personalized nutrition nudges!";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Keep logging your meals to get personalized nutrition nudges!";
  }
}

export async function generateWeeklyInsight(
  profile: User, 
  sleep: SleepLog[], 
  meals: MealLog[], 
  move: ActivityLog[]
) {
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
    return response.text?.trim() || "We're still analyzing your loops. Keep logging to see your weekly insight!";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "We're still analyzing your loops. Keep logging to see your weekly insight!";
  }
}
