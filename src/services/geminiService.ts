/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MealLog, SleepLog, ActivityLog, User } from "../types";

export async function generateNutritionNudge(meals: MealLog[], profile: User) {
  try {
    const response = await fetch("/api/gemini/nudge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meals, profileName: profile.displayName }),
    });
    
    if (!response.ok) throw new Error("Failed to fetch nudge");
    
    const data = await response.json();
    return data.text || "Keep logging your meals to get personalized nutrition nudges!";
  } catch (error) {
    console.error("Gemini Service Error:", error);
    return "Keep logging your meals to get personalized nutrition nudges!";
  }
}

export async function generateWeeklyInsight(
  profile: User, 
  sleep: SleepLog[], 
  meals: MealLog[], 
  move: ActivityLog[]
) {
  try {
    const response = await fetch("/api/gemini/insight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile, sleep, meals, move }),
    });
    
    if (!response.ok) throw new Error("Failed to fetch weekly insight");
    
    const data = await response.json();
    return data.text || "We're still analyzing your loops. Keep logging to see your weekly insight!";
  } catch (error) {
    console.error("Gemini Service Error:", error);
    return "We're still analyzing your loops. Keep logging to see your weekly insight!";
  }
}
