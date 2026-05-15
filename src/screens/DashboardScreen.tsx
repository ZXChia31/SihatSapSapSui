/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/UI';
import { useFirebase } from '../contexts/FirebaseContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import { Goal, Moon, Utensils, Zap, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useNavigate, useLocation } from 'react-router-dom';
import { generateNutritionNudge } from '../services/geminiService';
import { setDoc, doc, getDoc, getDocs } from 'firebase/firestore';
import { OperationType, handleFirestoreError } from '../lib/firebase';
import { MealLog, ActivityLog } from '../types';

export function DashboardScreen() {
  const { profile, user } = useFirebase();
  const navigate = useNavigate();
  const location = useLocation();
  const [todayScore, setTodayScore] = useState({ 
    sleep: 0, sleepSubtext: 'Loading...',
    eat: 0, eatSubtext: 'Loading...',
    move: 0, moveSubtext: 'Loading...',
    total: 0 
  });
  const [nudge, setNudge] = useState<string | null>(null);

  const fetchNudge = useCallback(async () => {
    if (!user || !profile) return;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const nudgePath = `nutritionNudges/${user.uid}_${todayStr}`;
    const nudgeRef = doc(db, nudgePath);
    
    try {
      const snap = await getDoc(nudgeRef);
      if (snap.exists()) {
        setNudge(snap.data().nudgeText);
      } else {
        const mealsPath = 'mealLogs';
        const mealsQuery = query(
          collection(db, mealsPath),
          where('userId', '==', user.uid),
          orderBy('date', 'desc'),
          limit(5)
        );
        
        let meals: MealLog[] = [];
        try {
          const mealsSnap = await getDocs(mealsQuery);
          meals = mealsSnap.docs.map(d => d.data() as MealLog);
        } catch (err) {
          console.warn('Failed to fetch meals for nudge:', err);
        }
        
        const newNudgeText = await generateNutritionNudge(meals, profile);
        try {
          await setDoc(nudgeRef, {
            userId: user.uid,
            date: todayStr,
            nudgeText: newNudgeText,
            generatedAt: new Date().toISOString()
          });
        } catch (err) {
           console.warn('Failed to save nudge:', err);
        }
        setNudge(newNudgeText);
      }
    } catch (err) {
      console.warn('Silent error in nudge fetching:', err);
    }
  }, [user, profile]);

  const fetchScores = useCallback(async () => {
    if (!user || !profile) return;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    
    try {
      // 1. Sleep Quality Score
      const sleepQuery = query(
        collection(db, 'sleepLogs'),
        where('userId', '==', user.uid),
        where('date', '==', todayStr),
        orderBy('loggedAt', 'desc'),
        limit(1)
      );
      const sleepSnap = await getDocs(sleepQuery);
      let sleepScore = 0;
      let sleepSubtext = 'No log today';
      if (!sleepSnap.empty) {
        const log = sleepSnap.docs[0].data();
        const targetHours = profile.sleepTargetHours || 8;
        const hourRatio = Math.min(log.hoursSlept / targetHours, 1.2);
        // Score = 70% duration + 30% mood
        sleepScore = Math.round((hourRatio * 70) + (log.moodRating * 6));
        sleepSubtext = `${log.hoursSlept.toFixed(1)}h · Mood: ${log.moodRating}/5`;
      }

      // 2. Nutritional Eating Score
      const mealQuery = query(
        collection(db, 'mealLogs'),
        where('userId', '==', user.uid),
        where('date', '==', todayStr)
      );
      const mealSnap = await getDocs(mealQuery);
      let eatScore = 0;
      let eatSubtext = 'Logs missing';
      if (!mealSnap.empty) {
        const meals = mealSnap.docs.map(d => d.data() as MealLog);
        const avgHealth = meals.reduce((acc, m) => acc + m.overallHealthRating, 0) / meals.length;
        const targetCount = profile.dailyHealthyMealTarget || 3;
        const countRatio = Math.min(meals.length / targetCount, 1);
        // Score = 40% consistency + 60% quality
        eatScore = Math.round((countRatio * 40) + (avgHealth * 12));
        eatSubtext = `${meals.length}/${targetCount} meals · Health: ${avgHealth.toFixed(1)}/5`;
      } else {
        eatSubtext = `Target: ${profile.dailyHealthyMealTarget || 3} meals`;
      }

      // 3. Physical Activity Score
      const moveQuery = query(
        collection(db, 'activityLogs'),
        where('userId', '==', user.uid),
        orderBy('date', 'desc'),
        limit(20)
      );
      const moveSnap = await getDocs(moveQuery);
      let moveScore = 0;
      let moveSubtext = 'Ready for action?';
      if (!moveSnap.empty) {
        const logs = moveSnap.docs.map(d => d.data() as ActivityLog);
        const todayLogs = logs.filter(l => l.date === todayStr);
        
        // Weekly consistency (Goal is weekly target)
        const weeklyCount = logs.filter(l => {
          const d = new Date(l.completedAt);
          const now = new Date();
          const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
          return diff <= 7;
        }).length;
        
        const target = profile.weeklyActivityTarget || 3;
        const weekRatio = Math.min(weeklyCount / target, 1);
        
        // Day Effort Bonus (0 to 30)
        let dayEffort = 0;
        if (todayLogs.length > 0) {
          dayEffort = todayLogs.reduce((acc, l) => {
             const intensityMultiplier = l.intensity === 'hard' ? 1.5 : l.intensity === 'moderate' ? 1 : 0.6;
             return acc + (l.durationMinutes * intensityMultiplier);
          }, 0);
        }
        const dayEffortBonus = Math.min(dayEffort / 30 * 20, 30); // 30 mins moderate = full bonus
        
        moveScore = Math.round((weekRatio * 70) + dayEffortBonus);
        moveSubtext = todayLogs.length > 0 ? `${todayLogs.length} activity today` : `${weeklyCount}/${target} this week`;
      }

      const total = Math.round((sleepScore + eatScore + moveScore) / 3);
      setTodayScore({ 
        sleep: Math.min(sleepScore, 100), 
        eat: Math.min(eatScore, 100), 
        move: Math.min(moveScore, 100), 
        total: Math.min(total, 100),
        sleepSubtext,
        eatSubtext,
        moveSubtext
      });

      // Background save - don't await to avoid blocking UI
      const scoreId = `${user.uid}_${todayStr}`;
      setDoc(doc(db, 'loopScores', scoreId), {
        userId: user.uid,
        date: todayStr,
        sleepScore: Math.min(sleepScore, 100),
        eatScore: Math.min(eatScore, 100),
        moveScore: Math.min(moveScore, 100),
        overallScore: Math.min(total, 100),
        computedAt: new Date().toISOString()
      }).catch(err => handleFirestoreError(err, OperationType.WRITE, `loopScores/${scoreId}`));

    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'multiple_collections');
    }
  }, [user, profile]);

  useEffect(() => {
    let isMounted = true;
    const fetchAll = async () => {
      try {
        await fetchNudge();
        if (isMounted) {
          await fetchScores();
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      }
    };
    fetchAll();
    return () => { isMounted = false; };
  }, [fetchNudge, fetchScores, location.key]);

  const data = [
    { name: 'Completed', value: todayScore.total },
    { name: 'Remaining', value: 100 - todayScore.total },
  ];

  const COLORS = ['#FFD600', '#00C896', '#7C3AED', '#F1F5F9'];

  return (
    <Layout userPhoto={profile?.photoUrl}>
      <div className="absolute top-0 right-0 w-64 h-64 bg-teal/5 blur-[80px] -z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet/5 blur-[100px] -z-10 pointer-events-none" />
      
      <header className="mb-10 flex items-center justify-between py-2">
        <div className="space-y-1">
          <h1 className="text-[30px] font-black leading-none tracking-tight text-navy">Good day, {profile?.displayName?.split(' ')[0]}!</h1>
          <p className="text-slate/60 font-bold text-xs uppercase tracking-[0.2em]">SihatSapSapSui Dashboard</p>
        </div>
        <button className="w-14 h-14 rounded-2xl bg-white shadow-lifted border border-slate/5 flex items-center justify-center text-navy transition-transform active:scale-95">
           <Goal size={28} />
        </button>
      </header>

      {/* Main Loop Visualization */}
      <div className="relative aspect-square w-full max-w-[280px] min-h-[280px] mx-auto mb-10 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <PieChart>
              <Pie
                data={data}
                innerRadius="85%"
                outerRadius="100%"
                paddingAngle={0}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cornerRadius={index === 0 ? 10 : 0} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="text-center relative z-10">
          <span className="text-[64px] font-black leading-none block text-navy">{todayScore.total}</span>
          <span className="text-slate/60 font-bold uppercase tracking-[0.2em] text-[12px]">Loop Score</span>
        </div>
      </div>

      {/* Domain Cards */}
      <div className="grid grid-cols-1 gap-4 mb-8">
        <button onClick={() => navigate('/sleep')} className="text-left w-full">
          <Card domain="sleep" className="flex items-center gap-4 hover:shadow-md transition-all active:scale-[0.98]">
            <div className="w-12 h-12 rounded-xl bg-amber/10 flex items-center justify-center text-amber">
              <Moon size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-[17px]">Sleep Quality</h3>
              <p className="text-slate text-sm font-medium">{todayScore.sleepSubtext}</p>
            </div>
            <div className="text-amber font-black text-xl">{todayScore.sleep}%</div>
          </Card>
        </button>

        <button onClick={() => navigate('/eat')} className="text-left w-full">
          <Card domain="eat" className="flex items-center gap-4 hover:shadow-md transition-all active:scale-[0.98]">
            <div className="w-12 h-12 rounded-xl bg-teal/10 flex items-center justify-center text-teal">
              <Utensils size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-[17px]">Nutritional Eating</h3>
              <p className="text-slate text-sm font-medium">{todayScore.eatSubtext}</p>
            </div>
            <div className="text-teal font-black text-xl">{todayScore.eat}%</div>
          </Card>
        </button>

        <button onClick={() => navigate('/move')} className="text-left w-full">
          <Card domain="move" className="flex items-center gap-4 hover:shadow-md transition-all active:scale-[0.98]">
            <div className="w-12 h-12 rounded-xl bg-violet/10 flex items-center justify-center text-violet">
              <Zap size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-[17px]">Physical Activity</h3>
              <p className="text-slate text-sm font-medium">{todayScore.moveSubtext}</p>
            </div>
            <div className="text-violet font-black text-xl">{todayScore.move}%</div>
          </Card>
        </button>
      </div>

      {/* AI Nudge */}
      {nudge && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-navy rounded-card p-6 text-white relative overflow-hidden mb-12 shadow-lifted"
        >
          <div className="absolute top-0 right-0 p-3 opacity-20">
            <Sparkles size={48} />
          </div>
          <h4 className="text-yellow font-black uppercase tracking-widest text-[12px] mb-2">Nutrition Nudge</h4>
          <p className="text-[17px] font-medium leading-relaxed relative z-10">{nudge}</p>
        </motion.div>
      )}
    </Layout>
  );
}
