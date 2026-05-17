/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SleepLog, MealLog, ActivityLog, User } from '../types';

export interface DailyScores {
  sleepScore: number;
  eatScore: number;
  moveScore: number;
  overallScore: number;
}

export function calculateSleepScore(log: SleepLog, profile: User): number {
  if (!log) return 0;
  
  const targetHours = profile.sleepTargetHours || 8;
  const hours = log.hoursSlept;
  
  // 1. Duration Score (60 pts)
  // Gaussian-like dropoff: perfect at target, drops if too little OR too much
  let durationScore: number;
  const diff = Math.abs(hours - targetHours);
  if (diff < 0.25) durationScore = 60; // Accuracy bonus for being very close
  else if (diff <= 1) durationScore = 50;
  else if (diff <= 2) durationScore = 30; // Slightly steeper dropoff
  else if (diff <= 3) durationScore = 10; // Significantly penalize large deviations
  else durationScore = 0;
  
  // Over-sleep penalty: sleeping 2.5h+ more than target can be groggy
  if (hours > targetHours + 2.5) {
    durationScore = Math.max(0, durationScore - 10);
  }
  
  // 2. Quality Score (30 pts)
  const qualityMap = [0, 0, 7, 15, 23, 30]; // 1-5 scale
  const qualityScore = qualityMap[log.moodRating] || 0;
  
  // 3. Timing Score (10 pts)
  // Sleeping before midnight is better for circadian rhythm
  let timingScore = 10;
  const [bedtimeH] = log.bedtime.split(':').map(Number);
  // If bedtime is after 6am and before 8pm, it's likely "shifted"
  if (bedtimeH >= 6 && bedtimeH < 20) {
    timingScore = 0;
  } else if (bedtimeH >= 0 && bedtimeH < 6) {
    // Bedtime between 12am and 6am
    timingScore = Math.max(0, 10 - (bedtimeH * 2));
  }
  
  return Math.round(Math.min(100, durationScore + qualityScore + timingScore));
}

export function calculateEatScore(meals: MealLog[], profile: User): number {
  if (!meals || meals.length === 0) return 0;
  
  const targetCount = profile.dailyHealthyMealTarget || 3;
  const nutritionTargets = profile.nutritionTargets || { protein: 150, fat: 70, fiber: 30 };
  
  // 1. Consistency Score (20 pts)
  const countRatio = Math.min(meals.length / targetCount, 1.2);
  const consistencyScore = Math.min(20, countRatio * 20);
  
  // 2. Nutritional Accuracy Score (50 pts)
  // Sum up grams for the day
  let totalProtein = 0;
  let totalFat = 0;
  let totalFiber = 0;
  
  meals.forEach(m => {
    // If grams are missing, we don't treat as 0 but instead don't add to totals?
    // Actually, if we want to be "fair", missing data shouldn't necessarily mean 0.
    // However, for total tracking, it's safer to use 0 or a baseline.
    // Let's use 0 for now as 'undefined || 0' is already there, but we could improve this later.
    totalProtein += m.proteinGrams || 0;
    totalFat += m.fatGrams || 0;
    totalFiber += m.fiberGrams || 0;
  });

  const getNutrientScore = (actual: number, target: number) => {
    if (target <= 0) return 1;
    const ratio = actual / target;
    // Gaussian-ish: 1.0 is perfect, falls off if over or under (especially fiber/protein over is ok-ish, fat over is worse)
    if (ratio >= 0.9 && ratio <= 1.2) return 1.0;
    if (ratio >= 0.7 && ratio < 0.9) return 0.8;
    if (ratio > 1.2 && ratio <= 1.5) return 0.7;
    return Math.max(0, 1 - Math.abs(1 - ratio) * 1.5);
  };

  const pScore = getNutrientScore(totalProtein, nutritionTargets.protein);
  const fScore = getNutrientScore(totalFat, nutritionTargets.fat);
  const fibScore = getNutrientScore(totalFiber, nutritionTargets.fiber);
  
  // Weight nutrients slightly: Protein 40%, Fat 30%, Fiber 30%
  const nutritionAccuracy = (pScore * 0.4 + fScore * 0.3 + fibScore * 0.3) * 50;

  // 3. Quality Score (20 pts)
  const avgHealth = meals.reduce((acc, m) => acc + m.overallHealthRating, 0) / meals.length;
  const qualityScore = (avgHealth / 5) * 20;
  
  // 4. Timing & Habits (10 pts)
  let habitScore = 0;
  const hasBreakfast = meals.some(m => {
    const hour = new Date(m.loggedAt).getHours();
    return hour >= 5 && hour < 11;
  });
  const hasDinner = meals.some(m => {
    const hour = new Date(m.loggedAt).getHours();
    return hour >= 17 && hour < 21;
  });
  
  if (hasBreakfast) habitScore += 5;
  if (hasDinner) habitScore += 5;
  
  return Math.round(Math.min(100, Math.max(0, consistencyScore + nutritionAccuracy + qualityScore + habitScore)));
}

export function calculateMoveScore(todayLogs: ActivityLog[], weeklyLogs: ActivityLog[], profile: User): number {
  const weeklyTarget = profile.weeklyActivityTarget || 3;
  
  // 1. Daily Performance (60 pts)
  let dailyUnits = 0;
  todayLogs.forEach(l => {
    const multiplier = l.intensity === 'hard' ? 1.5 : l.intensity === 'moderate' ? 1.0 : 0.6;
    dailyUnits += l.durationMinutes * multiplier;
  });
  // 45 units = full 60 points (e.g. 30m hard or 45m moderate)
  const dailyScore = Math.min(60, (dailyUnits / 45) * 60);
  
  // 2. Guided Bonus (10 pts)
  const hasGuided = todayLogs.some(l => l.activityName.includes('Workout'));
  const guidedScore = hasGuided ? 10 : 0;
  
  // 3. Weekly Consistency (30 pts)
  // Unique days with activity this week
  const uniqueDays = new Set(weeklyLogs.map(l => l.date)).size;
  const weeklyScore = Math.min(30, (uniqueDays / Math.min(weeklyTarget, 7)) * 30);
  
  return Math.min(100, Math.round(dailyScore + guidedScore + weeklyScore));
}

export function calculateOverallScore(scores: Omit<DailyScores, 'overallScore'>): number {
  return Math.round((scores.sleepScore + scores.eatScore + scores.moveScore) / 3);
}

export function calculateStreaks(sleepLogs: SleepLog[], mealLogs: MealLog[], activityLogs: ActivityLog[], profile: User) {
  const getLogsForDay = (logs: (SleepLog | MealLog | ActivityLog)[], date: string) => logs.filter(l => l.date === date);
  const today = new Date();
  const dateToStr = (d: Date) => d.toISOString().split('T')[0];

  const checkDaySuccess = (dateStr: string) => {
    const s = getLogsForDay(sleepLogs, dateStr) as SleepLog[];
    const m = getLogsForDay(mealLogs, dateStr) as MealLog[];
    const a = getLogsForDay(activityLogs, dateStr) as ActivityLog[];
    
    const sleepOk = s.length > 0 && s[0].hoursSlept >= (profile.sleepTargetHours - 1);
    const eatOk = m.length >= (profile.dailyHealthyMealTarget || 3);
    const moveOk = a.length > 0;
    
    return { sleepOk, eatOk, moveOk, allOk: sleepOk && eatOk && moveOk };
  };

  const streaks = { sleep: 0, eat: 0, move: 0, overall: 0 };
  const active = { sleep: true, eat: true, move: true, overall: true };

  for (let i = 0; i < 60; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = dateToStr(d);
    const results = checkDaySuccess(dateStr);

    if (active.sleep && results.sleepOk) streaks.sleep++; else if (i > 0) active.sleep = false;
    if (active.eat && results.eatOk) streaks.eat++; else if (i > 0) active.eat = false;
    if (active.move && results.moveOk) streaks.move++; else if (i > 0) active.move = false;
    if (active.overall && results.allOk) streaks.overall++; else if (i > 0) active.overall = false;
    
    if (!Object.values(active).some(v => v)) break;
  }

  return streaks;
}

export function generatePatternNudges(sleepLogs: SleepLog[], mealLogs: MealLog[], activityLogs: ActivityLog[]) {
  const nudges: { title: string; message: string; type: 'sleep' | 'eat' | 'move' | 'ai' }[] = [];
  
  // 1. Correlation: Move -> Sleep
  // Find days where they worked out and check that night's sleep mood
  activityLogs.forEach(move => {
    const sleepThatNight = sleepLogs.find(s => s.date === move.date);
    if (sleepThatNight && sleepThatNight.moodRating >= 4 && move.durationMinutes >= 30) {
      nudges.push({
        title: 'Move-Sleep Sync',
        message: `You slept better after that ${move.durationMinutes}m ${move.activityName || 'workout'} yesterday! Keep it up.`,
        type: 'ai'
      });
    }
  });

  // 2. Nutrition Insight: Fiber/Protein
  const recentMeals = mealLogs.slice(0, 5);
  const avgFiber = recentMeals.reduce((acc, m) => acc + (m.fiberGrams || 0), 0) / (recentMeals.length || 1);
  if (avgFiber < 5 && recentMeals.length > 0) {
    nudges.push({
      title: 'Fiber Boost',
      message: 'Try adding more fiber (like oats or beans) to your next meal to hit your daily goal.',
      type: 'eat'
    });
  }

  // 3. Sleep Timing
  const lateSleepers = sleepLogs.filter(s => {
    const [h] = s.bedtime.split(':').map(Number);
    return h >= 0 && h < 2;
  }).length;
  if (lateSleepers >= 3) {
    nudges.push({
      title: 'Clocking Out',
      message: 'You\'ve been sleeping late this week. Aim for a 30m earlier bedtime tonight to reset.',
      type: 'sleep'
    });
  }

  return nudges;
}
