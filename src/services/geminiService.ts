/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MealLog, SleepLog, ActivityLog, User } from "../types";
import { doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { format } from 'date-fns';

export async function trackAIUsage(userId: string) {
  const userRef = doc(db, 'users', userId);
  const today = format(new Date(), 'yyyy-MM-dd');
  
  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const existingUsage = data.aiUsage || {};
    
    const lastResetDate = existingUsage.lastResetDate || '';
    const currentBalance = existingUsage.balance !== undefined ? existingUsage.balance : (100 - (existingUsage.dailyRequests || 0));
    
    // Reset if it's a new day
    if (lastResetDate !== today) {
      await updateDoc(userRef, {
        'aiUsage.dailyRequests': 1,
        'aiUsage.lastResetDate': today,
        'aiUsage.totalRequests': increment(1),
        'aiUsage.balance': 99
      });
      console.log('AI Usage reset for new day');
    } else {
      await updateDoc(userRef, {
        'aiUsage.dailyRequests': increment(1),
        'aiUsage.totalRequests': increment(1),
        'aiUsage.balance': Math.max(0, currentBalance - 1)
      });
      console.log('AI Usage tracked. Remaining balance:', currentBalance - 1);
    }
  } catch (err) {
    console.error('Failed to track AI usage:', err);
  }
}

export async function generateDailyInsight(
  userId: string,
  profile: User,
  sleep: SleepLog | null,
  meals: MealLog[],
  move: ActivityLog[]
) {
  try {
    const response = await fetch("/api/gemini/daily", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile, sleep, meals, move }),
    });
    
    if (!response.ok) throw new Error("Failed to fetch daily insight");
    
    const data = await response.json();
    if (data.text) await trackAIUsage(userId);
    return data.text || "Start logging your loops to get your daily insight!";
  } catch (error) {
    console.error("Gemini Service Error:", error);
    return "Start logging your loops to get your daily insight!";
  }
}

export async function generateWeeklyInsight(
  userId: string,
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
    if (data.text) await trackAIUsage(userId);
    return data.text || "We're still analyzing your loops. Keep logging to see your weekly insight!";
  } catch (error) {
    console.error("Gemini Service Error:", error);
    return "We're still analyzing your loops. Keep logging to see your weekly insight!";
  }
}
