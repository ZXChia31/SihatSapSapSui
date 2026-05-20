/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/UI';
import { useFirebase } from '../contexts/FirebaseContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { format } from 'date-fns';
import { Goal, Moon, Utensils, Zap, Sparkles, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useNavigate, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { generateDailyInsight, generateWeeklyInsight } from '../services/geminiService';
import { setDoc, doc, getDoc } from 'firebase/firestore';
import { OperationType, handleFirestoreError } from '../lib/firebase';
import { MealLog, ActivityLog, SleepLog } from '../types';
import { cn } from '../lib/utils';
import { 
  calculateSleepScore, 
  calculateEatScore, 
  calculateMoveScore, 
  calculateOverallScore,
  calculateStreaks
} from '../lib/scoring';

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
  const [streaks, setStreaks] = useState({ sleep: 0, eat: 0, move: 0, overall: 0 });
  const [dailyInsight, setDailyInsight] = useState<string | null>(null);
  const [weeklyInsight, setWeeklyInsight] = useState<string | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const [feedback, setFeedback] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const fetchWeeklyInsight = useCallback(async (force = false) => {
    if (!user || !profile) return;
    
    if (force) {
      setIsRecalculating(true);
      showFeedback('Generating fresh insights...');
    }
    
    // Get start of the week (last Sunday)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek;
    const sunday = new Date(today.setDate(diff));
    const sundayStr = format(sunday, 'yyyy-MM-dd');
    
    const insightPath = `weeklyInsights/${user.uid}_${sundayStr}`;
    const insightRef = doc(db, insightPath);
    
    try {
      const snap = await getDoc(insightRef);
      if (snap.exists() && !force) {
        setWeeklyInsight(snap.data().insightText);
      } else if (dayOfWeek === 0 || force) { 
        // Force or Sunday: Generate fresh
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = format(sevenDaysAgo, 'yyyy-MM-dd');

        const fetchLogs = async (collectionName: string) => {
          const q = query(
            collection(db, collectionName),
            where('userId', '==', user.uid),
            where('date', '>=', sevenDaysAgoStr)
          );
          const snap = await getDocs(q);
          return snap.docs.map(d => d.data());
        };

        const [sleep, meals, move] = await Promise.all([
          fetchLogs('sleepLogs') as Promise<SleepLog[]>,
          fetchLogs('mealLogs') as Promise<MealLog[]>,
          fetchLogs('activityLogs') as Promise<ActivityLog[]>
        ]);

        const insightText = await generateWeeklyInsight(user.uid, profile, sleep, meals, move);
        
        await setDoc(insightRef, {
          userId: user.uid,
          weekStartDate: sundayStr,
          insightText,
          generatedAt: new Date().toISOString()
        });
        
        setWeeklyInsight(insightText);
        if (force) showFeedback('Weekly report recalculated!');
      } else {
        if (force) showFeedback('Deep dive is only available with enough data.');
      }
    } catch (err) {
      console.warn('Failed to fetch weekly insight:', err);
      if (force) showFeedback('Failed to recalculate. Check connection.');
    } finally {
      if (force) setIsRecalculating(false);
    }
  }, [user, profile]);

  const fetchDailyInsight = useCallback(async () => {
    if (!user || !profile) return;
    
    // Check local client quota/balance limit
    const balance = profile.aiUsage?.balance ?? 100;
    if (balance <= 0) {
      setDailyInsight("AI usage hit its quota and let the AI rest for a while.");
      return;
    }

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const insightPath = `dailyInsights/${user.uid}_${todayStr}`;
    const insightRef = doc(db, insightPath);
    
    try {
      const snap = await getDoc(insightRef);
      
      // Fetch today's actual data to see if we should re-generate or if it's dynamic enough
      const fetchLogs = async (collectionName: string) => {
        const q = query(
          collection(db, collectionName),
          where('userId', '==', user.uid),
          where('date', '==', todayStr)
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => d.data());
      };

      const [sleepLogs, mealLogs, activityLogs] = await Promise.all([
        fetchLogs('sleepLogs') as Promise<SleepLog[]>,
        fetchLogs('mealLogs') as Promise<MealLog[]>,
        fetchLogs('activityLogs') as Promise<ActivityLog[]>
      ]);

      const sleep = sleepLogs[0] || null;
      const meals = mealLogs;
      const move = activityLogs;

      // Detailed content fingerprint representing the actual contents and details of today's logs
      const sleepFingerprint = sleepLogs.map(s => `${s.hoursSlept}-${s.moodRating}-${s.bedtime}-${s.wakeTime}`).join('|');
      const mealsFingerprint = mealLogs.map(m => `${m.mealSlot}-${m.overallHealthRating}-${m.proteinGrams || 0}`).join('|');
      const moveFingerprint = activityLogs.map(a => `${a.activityName}-${a.durationMinutes}-${a.moodRating}`).join('|');
      const profileFingerprint = `${profile.sleepTargetHours || 8}_${profile.dailyHealthyMealTarget || 3}_${profile.weeklyActivityTarget || 3}`;
      const fingerprint = `${sleepFingerprint}__${mealsFingerprint}__${moveFingerprint}__${profileFingerprint}`;

      if (snap.exists() && snap.data().fingerprint === fingerprint) {
        setDailyInsight(snap.data().insightText);
      } else {
        const newInsightText = await generateDailyInsight(user.uid, profile, sleep, meals, move);
        try {
          await setDoc(insightRef, {
            userId: user.uid,
            date: todayStr,
            insightText: newInsightText,
            fingerprint,
            generatedAt: new Date().toISOString()
          });
        } catch (err) {
           console.warn('Failed to save daily insight:', err);
        }
        setDailyInsight(newInsightText);
      }
    } catch (err) {
      console.warn('Silent error in daily insight fetching:', err);
    }
  }, [user, profile]);

  const fetchScores = useCallback(async () => {
    if (!user || !profile) return;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const sixtyDaysAgoStr = format(sixtyDaysAgo, 'yyyy-MM-dd');
    
    try {
      const fetchLogs = async (collectionName: string) => {
        const q = query(
          collection(db, collectionName),
          where('userId', '==', user.uid),
          where('date', '>=', sixtyDaysAgoStr)
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => d.data());
      };

      const [allSleepLogs, allMealLogs, allActivityLogs] = await Promise.all([
        fetchLogs('sleepLogs') as Promise<SleepLog[]>,
        fetchLogs('mealLogs') as Promise<MealLog[]>,
        fetchLogs('activityLogs') as Promise<ActivityLog[]>
      ]);

      // 1. Current Scores
      const todaySleepLogs = allSleepLogs.filter(l => l.date === todayStr);
      let sleepScore = 0;
      let sleepSubtext = 'No log today';
      if (todaySleepLogs.length > 0) {
        sleepScore = calculateSleepScore(todaySleepLogs, profile);
        const totalHours = todaySleepLogs.reduce((acc, l) => acc + l.hoursSlept, 0);
        const avgMood = Math.round(todaySleepLogs.reduce((acc, l) => acc + l.moodRating, 0) / todaySleepLogs.length);
        sleepSubtext = `${totalHours.toFixed(1)}h · Mood: ${avgMood}/5`;
      }

      const todayMealLogs = allMealLogs.filter(l => l.date === todayStr);
      let eatScore = 0;
      let eatSubtext = 'Logs missing';
      if (todayMealLogs.length > 0) {
        const avgHealth = todayMealLogs.reduce((acc, m) => acc + m.overallHealthRating, 0) / todayMealLogs.length;
        const targetCount = profile.dailyHealthyMealTarget || 3;
        eatScore = calculateEatScore(todayMealLogs, profile);
        eatSubtext = `${todayMealLogs.length}/${targetCount} meals · Health: ${avgHealth.toFixed(1)}/5`;
      } else {
        eatSubtext = `Target: ${profile.dailyHealthyMealTarget || 3} meals`;
      }

      const todayMoveLogs = allActivityLogs.filter(l => l.date === todayStr);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const weeklyMoveLogs = allActivityLogs.filter(l => new Date(l.completedAt) >= sevenDaysAgo);
      
      const moveScore = calculateMoveScore(todayMoveLogs, weeklyMoveLogs, profile);
      const moveTarget = profile.weeklyActivityTarget || 3;
      const weeklyCount = new Set(weeklyMoveLogs.map(l => l.date)).size;
      const moveSubtext = todayMoveLogs.length > 0 ? `${todayMoveLogs.length} activity today` : `${weeklyCount}/${moveTarget} days this week`;

      const total = calculateOverallScore({ sleepScore, eatScore, moveScore });
      setTodayScore({ 
        sleep: Math.min(sleepScore, 100), 
        eat: Math.min(eatScore, 100), 
        move: Math.min(moveScore, 100), 
        total: Math.min(total, 100),
        sleepSubtext,
        eatSubtext,
        moveSubtext
      });

      // 2. Streaks
      const currentStreaks = calculateStreaks(allSleepLogs, allMealLogs, allActivityLogs, profile);
      setStreaks(currentStreaks);

      // Background save
      const scoreId = `${user.uid}_${todayStr}`;
      setDoc(doc(db, 'loopScores', scoreId), {
        userId: user.uid,
        date: todayStr,
        sleepScore: Math.round(Math.min(sleepScore, 100)),
        eatScore: Math.round(Math.min(eatScore, 100)),
        moveScore: Math.round(Math.min(moveScore, 100)),
        overallScore: Math.round(Math.min(total, 100)),
        computedAt: new Date().toISOString()
      }).catch(err => handleFirestoreError(err, OperationType.WRITE, `loopScores/${scoreId}`));

    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'multiple_collections');
    }
  }, [user, profile]);

  useEffect(() => {
    let isMounted = true;
    
    const initializeUsage = async () => {
      if (!user || !profile || profile.aiUsage) return;
      const today = format(new Date(), 'yyyy-MM-dd');
      const userRef = doc(db, 'users', user.uid);
      try {
        await updateDoc(userRef, {
          aiUsage: {
            dailyRequests: 0,
            totalRequests: 0,
            lastResetDate: today,
            balance: 100
          }
        });
      } catch (err) {
        console.warn('Failed to initialize AI usage:', err);
      }
    };

    const fetchAll = async () => {
      try {
        await initializeUsage();
        // Sequentialize to avoid burst 429s
        await fetchDailyInsight();
        await new Promise(res => setTimeout(res, 1000));
        await fetchWeeklyInsight();
        
        if (isMounted) {
          await fetchScores();
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      }
    };
    fetchAll();
    return () => { isMounted = false; };
  }, [user, profile, fetchDailyInsight, fetchWeeklyInsight, fetchScores, location.key]);

  // Domain logic: Full circle composition based on relative contributions.
  // If Eat is 0, the circle is split only between Sleep and Move.
  // This helps visualize the "Loop balance".
  // Domain logic: Compositional visualization of the Loop.
  // The circle represents the 100% of the active loop components.
  // If a domain is 0, it doesn't take up space, allowing others to fill the loop proportionally.
  const activeSegments = [
    { name: 'Sleep', value: todayScore.sleep || 0 },
    { name: 'Eat', value: todayScore.eat || 0 },
    { name: 'Move', value: todayScore.move || 0 },
  ].filter(d => d.value > 0);

  // If nothing is logged, we show the 'Empty' state which is the grey track.
  const chartData = activeSegments.length > 0 
    ? activeSegments 
    : [{ name: 'Empty', value: 1 }];

  const DOMAIN_COLORS: Record<string, string> = {
    'Sleep': '#FFD600', // Amber
    'Eat': '#00C896',   // Teal/Green
    'Move': '#7C3AED',  // Violet
    'Empty': '#F1F5F9'  // Slate/Grey
  };

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
      <div className="relative w-full max-w-[340px] mx-auto mb-12 aspect-square flex items-center justify-center">
        {/* Glow behind the score */}
        <div className={cn(
          "absolute inset-0 m-auto w-[75%] h-[75%] rounded-full blur-[60px] opacity-20 transition-all duration-1000",
          todayScore.total > 70 ? "bg-teal" : todayScore.total > 40 ? "bg-amber" : "bg-red-500"
        )} />
        
        <div className="absolute inset-0 w-full h-full flex items-center justify-center">
          <ResponsiveContainer width="95%" aspect={1}>
            <PieChart>
              <Pie
                data={chartData}
                innerRadius="88%"
                outerRadius="100%"
                paddingAngle={activeSegments.length > 1 ? 6 : 0}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
                stroke="none"
                animationBegin={0}
                animationDuration={1200}
                animationEasing="ease-out"
                isAnimationActive={true}
              >
                {chartData.map((entry) => (
                  <Cell 
                    key={`cell-${entry.name}`} 
                    fill={DOMAIN_COLORS[entry.name] || '#CBD5E1'} 
                    cornerRadius={activeSegments.length <= 1 ? 0 : 12}
                    style={{ outline: 'none' }}
                    stroke="none"
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center flex flex-col items-center">
            <motion.div
              key={todayScore.total}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center"
            >
              <span className="text-[72px] font-black leading-none block text-navy tracking-tighter">{todayScore.total}</span>
              <span className="text-slate/40 font-black uppercase tracking-[0.25em] text-[10px] mt-1">Loop Score</span>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Domain Legend */}
      <div className="flex justify-center gap-5 mb-12 -mt-4">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-amber shadow-[0_0_8px_rgba(255,193,7,0.3)]" />
          <span className="text-[10px] font-black text-navy/50 uppercase tracking-widest">Sleep</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-teal shadow-[0_0_8px_rgba(0,200,150,0.3)]" />
          <span className="text-[10px] font-black text-navy/50 uppercase tracking-widest">Eat</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-violet shadow-[0_0_8px_rgba(124,58,237,0.3)]" />
          <span className="text-[10px] font-black text-navy/50 uppercase tracking-widest">Move</span>
        </div>
      </div>

      {/* Streaks Banner */}
      <div className="flex gap-3 mb-10 overflow-x-auto pb-2 scrollbar-none px-1">
        {[
          { label: 'Overall', value: streaks.overall, color: 'navy', icon: <Goal size={16} /> },
          { label: 'Sleep', value: streaks.sleep, color: 'amber', icon: <Moon size={16} /> },
          { label: 'Nutrition', value: streaks.eat, color: 'teal', icon: <Utensils size={16} /> },
          { label: 'Active', value: streaks.move, color: 'violet', icon: <Zap size={16} /> }
        ].map((s, i) => (
          <motion.div 
            key={s.label}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className={cn(
              "shrink-0 px-4 py-3 rounded-2xl border flex items-center gap-3 shadow-sm transition-all",
              s.color === 'navy' ? "bg-navy text-white border-navy" : 
              s.color === 'amber' ? "bg-amber/5 text-amber border-amber/10" : 
              s.color === 'teal' ? "bg-teal/5 text-teal border-teal/10" : 
              "bg-violet/5 text-violet border-violet/10"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center",
              s.color === 'navy' ? "bg-white/20" : "bg-white shadow-sm"
            )}>
              {s.icon}
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest opacity-60 leading-none mb-1">{s.label}</div>
              <div className="text-[15px] font-black leading-none">{s.value} Day{s.value !== 1 && 's'}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Domain Cards */}
      <div className="grid grid-cols-1 gap-5 mb-10">
        <button onClick={() => navigate('/sleep')} className="text-left w-full group">
          <Card domain="sleep" className="flex items-center gap-5 p-5 hover:shadow-xl hover:-translate-y-1 transition-all active:scale-[0.98] border-none shadow-lifted">
            <div className="w-14 h-14 rounded-2xl bg-amber/10 flex items-center justify-center text-amber shadow-inner group-hover:scale-110 transition-transform">
              <Moon size={28} />
            </div>
            <div className="flex-1">
              <h3 className="font-black text-lg text-navy leading-none mb-1.5">Sleep Quality</h3>
              <p className="text-slate text-sm font-medium opacity-70">{todayScore.sleepSubtext}</p>
            </div>
            <div className="flex flex-col items-end">
              <div className="text-amber font-black text-2xl leading-none">{todayScore.sleep.toFixed(0)}%</div>
              <div className="text-[10px] font-black text-amber/40 uppercase tracking-widest mt-1">Daily</div>
            </div>
          </Card>
        </button>

        <button onClick={() => navigate('/eat')} className="text-left w-full group">
          <Card domain="eat" className="flex items-center gap-5 p-5 hover:shadow-xl hover:-translate-y-1 transition-all active:scale-[0.98] border-none shadow-lifted">
            <div className="w-14 h-14 rounded-2xl bg-teal/10 flex items-center justify-center text-teal shadow-inner group-hover:scale-110 transition-transform">
              <Utensils size={28} />
            </div>
            <div className="flex-1">
              <h3 className="font-black text-lg text-navy leading-none mb-1.5">Nutritional Eating</h3>
              <p className="text-slate text-sm font-medium opacity-70">{todayScore.eatSubtext}</p>
            </div>
            <div className="flex flex-col items-end">
              <div className="text-teal font-black text-2xl leading-none">{todayScore.eat.toFixed(0)}%</div>
              <div className="text-[10px] font-black text-teal/40 uppercase tracking-widest mt-1">Daily</div>
            </div>
          </Card>
        </button>

        <button onClick={() => navigate('/move')} className="text-left w-full group">
          <Card domain="move" className="flex items-center gap-5 p-5 hover:shadow-xl hover:-translate-y-1 transition-all active:scale-[0.98] border-none shadow-lifted">
            <div className="w-14 h-14 rounded-2xl bg-violet/10 flex items-center justify-center text-violet shadow-inner group-hover:scale-110 transition-transform">
              <Zap size={28} />
            </div>
            <div className="flex-1">
              <h3 className="font-black text-lg text-navy leading-none mb-1.5">Physical Activity</h3>
              <p className="text-slate text-sm font-medium opacity-70">{todayScore.moveSubtext}</p>
            </div>
            <div className="flex flex-col items-end">
              <div className="text-violet font-black text-2xl leading-none">{todayScore.move.toFixed(0)}%</div>
              <div className="text-[10px] font-black text-violet/40 uppercase tracking-widest mt-1">Daily</div>
            </div>
          </Card>
        </button>
      </div>

      {/* Weekly Insight */}
      {weeklyInsight && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[32px] p-8 border border-slate/5 mb-8 shadow-card relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 rotate-12 transition-transform group-hover:rotate-45 duration-700">
            <Goal size={160} />
          </div>
          
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-violet/10 flex items-center justify-center text-violet shadow-inner">
               <Sparkles className="animate-pulse" size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-navy leading-none">Weekly Loop Deep Dive</h2>
              <p className="text-[10px] font-black text-slate/40 uppercase tracking-[0.2em] mt-1">Generated by Sihat AI</p>
            </div>
          </div>
          
          <div className="prose prose-slate max-w-none 
            prose-p:text-[16px] prose-p:leading-[1.7] prose-p:font-medium prose-p:text-navy/80 
            prose-headings:text-navy prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight 
            prose-strong:text-navy prose-strong:font-black 
            prose-li:text-[15px] prose-li:font-medium
            prose-code:bg-off-white prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-navy prose-code:font-bold">
             <div className="markdown-body">
               <ReactMarkdown>{weeklyInsight}</ReactMarkdown>
             </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-off-white flex justify-between items-center bg-white/50">
             <span className="text-[10px] font-black uppercase text-slate/30 tracking-tight italic">Refreshes every Sunday • Stay consistent</span>
             <button 
               disabled={isRecalculating}
               onClick={() => fetchWeeklyInsight(true)} 
               className={cn(
                 "text-[11px] font-black uppercase h-8 px-4 rounded-full border transition-all active:scale-95 flex items-center gap-2",
                 isRecalculating 
                  ? "bg-navy/10 text-navy/40 border-navy/5 cursor-not-allowed" 
                  : "text-navy border-navy/10 hover:bg-navy hover:text-white"
               )}
             >
               {isRecalculating && <RefreshCw size={12} className="animate-spin" />}
               {isRecalculating ? 'Calculating...' : 'Recalculate'}
             </button>
          </div>
        </motion.div>
      )}

      {/* Daily Insight */}
      {dailyInsight && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-navy to-navy/90 rounded-[32px] p-8 text-white relative overflow-hidden mb-16 shadow-2xl group"
        >
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-teal/20 blur-[80px] rounded-full" />
          <div className="absolute top-0 right-0 p-6 opacity-30 group-hover:scale-110 transition-transform duration-500">
            <Sparkles size={56} />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-yellow animate-ping" />
              <h4 className="text-yellow font-black uppercase tracking-[0.2em] text-[11px]">Daily Micro-Insight</h4>
            </div>
            <p className="text-[19px] font-medium leading-relaxed tracking-tight text-white/90 italic">"{dailyInsight}"</p>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {feedback && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-navy text-white px-6 py-3 rounded-full font-bold shadow-2xl z-[100] whitespace-nowrap"
          >
            {feedback}
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
