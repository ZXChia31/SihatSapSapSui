/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type ActivityType = 'self_logged' | 'guided';
export type Intensity = 'light' | 'moderate' | 'hard';
export type EnergyCost = 'low' | 'medium';

export interface User {
  uid: string;
  displayName: string;
  email: string;
  photoUrl: string;
  sleepTargetBedtime: string; // HH:MM
  sleepTargetWakeTime: string; // HH:MM
  sleepTargetHours: number;
  weeklyActivityTarget: number; // sessions per week
  weeklyActivityDurationTarget?: number; // minutes per week
  dailyHealthyMealTarget: number; // 1-5 sessions
  nutritionTargets?: {
    protein: number; // grams per day
    fat: number; // grams per day
    fiber: number; // grams per day
  };
  aiFocusPreferences?: string[];
  aiUsage?: {
    dailyRequests: number;
    lastResetDate: string; // YYYY-MM-DD
    totalRequests: number;
    balance?: number;
  };
  streaks?: {
    sleep: number;
    eat: number;
    move: number;
    overall: number;
  };
  createdAt: string; // ISO
  onboardingComplete: boolean;
  age?: number;
  weight?: number; // kg
  height?: number; // cm
  bmi?: number;
  habits?: {
    sleep: string;
    eat: string;
    move: string;
  };
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  settings?: {
    pushNotifications: boolean;
    activityReminders: boolean;
    sleepAlerts: boolean;
    aiInsights: boolean;
  };
}

export interface SleepLog {
  id?: string;
  userId: string;
  date: string; // YYYY-MM-DD
  bedtime: string; // HH:MM
  wakeTime: string; // HH:MM
  hoursSlept: number;
  moodRating: number; // 1-5
  loggedAt: string;
}

export interface MealLog {
  id?: string;
  userId: string;
  date: string;
  mealName: string;
  mealSlot: MealSlot;
  proteinGrams?: number;
  fatGrams?: number;
  fiberGrams?: number;
  overallHealthRating: number;
  loggedAt: string;
}

export interface ActivityLog {
  id?: string;
  userId: string;
  date: string;
  activityName: string;
  activityType: ActivityType;
  durationMinutes: number;
  intensity: Intensity;
  completedAt: string;
}

export interface Exercise {
  name: string;
  repOrDuration: string;
  instructions: string;
}

export interface GuidedWorkout {
  id?: string;
  title: string;
  durationMinutes: number;
  energyCost: EnergyCost;
  exercises: Exercise[];
}

export interface LoopScore {
  id?: string;
  userId: string;
  date: string;
  sleepScore: number;
  eatScore: number;
  moveScore: number;
  overallScore: number;
  computedAt: string;
}

export interface NutritionNudge {
  id?: string;
  userId: string;
  date: string;
  nudgeText: string;
  generatedAt: string;
}

export interface WeeklyInsight {
  id?: string;
  userId: string;
  weekStartDate: string; // Monday YYYY-MM-DD
  insightText: string;
  generatedAt: string;
}
