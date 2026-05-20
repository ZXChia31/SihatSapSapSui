import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirebase } from '../contexts/FirebaseContext';
import { SleepLog, MealLog, ActivityLog } from '../types';
import { Layout } from '../components/Layout';
import { Card } from '../components/UI';
import { ArrowLeft, CheckCircle2, Circle, Sparkles, Plus, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface SuggestedHabit {
  title: string;
  reasoning: string;
  category: 'sleep' | 'eat' | 'move';
}

export function YourHabitsScreen() {
  const { profile, user } = useFirebase();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([]);
  const [mealLogs, setMealLogs] = useState<MealLog[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [fetchingLogs, setFetchingLogs] = useState(true);

  // Default habits derived from my understanding of the app's goals
  const defaultHabits = [
    "Consistent Wake-up Time",
    "No caffeine after 2 PM",
    "30-min morning walk",
    "Balanced macro distribution",
    "Screen-free hour before bed",
    "Hydration: 2L+ daily",
    "Regular activity breaks"
  ];

  const habits = Array.isArray(profile?.habitsList) ? profile.habitsList : defaultHabits;
  const completedHabits = Array.isArray(profile?.completedHabits) ? profile.completedHabits : [];

  useEffect(() => {
    if (!user) return;
    
    const fetchAllLogs = async () => {
      try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

        const fetchLogsForCollection = async (collectionName: string) => {
          const q = query(
            collection(db, collectionName),
            where('userId', '==', user.uid),
            where('date', '>=', sevenDaysAgoStr)
          );
          const snap = await getDocs(q);
          return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        };

        const [sleep, meals, move] = await Promise.all([
          fetchLogsForCollection('sleepLogs'),
          fetchLogsForCollection('mealLogs'),
          fetchLogsForCollection('activityLogs')
        ]);

        setSleepLogs(sleep);
        setMealLogs(meals);
        setActivityLogs(move);
      } catch (err) {
        console.warn('Error fetching logs for habits:', err);
      } finally {
        setFetchingLogs(false);
      }
    };

    fetchAllLogs();
  }, [user]);

  const getPersonalizedSuggestions = (): SuggestedHabit[] => {
    const suggestions: SuggestedHabit[] = [];

    // Parse onboarding habits
    const onboardingSleep = profile?.habits?.sleep || "";
    const onboardingEat = profile?.habits?.eat || "";
    const onboardingMove = profile?.habits?.move || "";

    // 1. SLEEP RECOMMENDATIONS
    if (onboardingSleep.includes("phone right before bed") || onboardingSleep.includes("Sluggish")) {
      suggestions.push({
        title: "Screen-free hour before bed",
        reasoning: "Your onboarding concerns flagged late-night screens. Resetting melatonin helps deep slow-wave rest stages.",
        category: "sleep"
      });
    }
    if (onboardingSleep.includes("inconsistent sleep schedule") || onboardingSleep.includes("sleep late")) {
      suggestions.push({
        title: `Bedtime wind-down at ${profile?.sleepTargetBedtime || '23:00'}`,
        reasoning: "To stabilize your circadian rhythm and optimize daily cognitive sharpness.",
        category: "sleep"
      });
    }
    
    // Check sleep logs
    if (sleepLogs.length > 0) {
      const avgSleep = sleepLogs.reduce((sum, s) => sum + (s.hoursSlept || 0), 0) / sleepLogs.length;
      const sleepTarget = profile?.sleepTargetHours || 8;
      if (avgSleep < sleepTarget) {
        suggestions.push({
          title: `Prioritize ${sleepTarget} hrs of sleep`,
          reasoning: `Recent sleep registers around ${avgSleep.toFixed(1)} hrs, below your target goal.`,
          category: "sleep"
        });
      }
    }

    // 2. EAT RECOMMENDATIONS
    if (onboardingEat.includes("skip breakfast")) {
      suggestions.push({
        title: "Nutrient-packed breakfast",
        reasoning: "A balanced, protein-rich morning meal breaks your fast and stabilizes glucose levels.",
        category: "eat"
      });
    }
    if (onboardingEat.includes("very little water")) {
      suggestions.push({
        title: "Drink a large glass of water upon waking",
        reasoning: "Starting the day with water triggers metabolic processes and hydration.",
        category: "eat"
      });
    }
    if (onboardingEat.includes("sugary snacks")) {
      suggestions.push({
        title: "Pre-pack healthy snack alternatives",
        reasoning: "To combat mid-afternoon energy slumps without empty processed sugar calories.",
        category: "eat"
      });
    }
    // Check eat logs
    if (mealLogs.length > 0) {
      const avgRating = mealLogs.reduce((sum, m) => sum + (m.overallHealthRating || 0), 0) / mealLogs.length;
      if (avgRating < 3.5) {
        suggestions.push({
          title: "Prep 1 clean, whole-food meal daily",
          reasoning: "Based on recent meal logs wanting a boost on healthy whole nutrition metrics.",
          category: "eat"
        });
      }
    }

    // 3. MOVE RECOMMENDATIONS
    if (onboardingMove.includes("desk for 8+ hours")) {
      suggestions.push({
        title: "Take short dynamic movement breaks",
        reasoning: "Active standing helps reset posture, stretch joints, and boost blood flow every 90 minutes.",
        category: "move"
      });
    }
    if (onboardingMove.includes("struggle to stay motivated") || onboardingMove.includes("rarely walk")) {
      suggestions.push({
        title: "Complete a light 15-minute walk",
        reasoning: "Bypasses high friction barriers to build physical momentum.",
        category: "move"
      });
    }
    // Check activity logs
    if (activityLogs.length < (profile?.weeklyActivityTarget || 3)) {
      suggestions.push({
        title: "Log at least 3 active sessions weekly",
        reasoning: `Keep pushing for your Move targets of ${profile?.weeklyActivityTarget || 3} active cycles per week.`,
        category: "move"
      });
    }

    // Build standard, high quality defaults if we still have fewer suggestions
    if (suggestions.length < 3) {
      suggestions.push({
        title: "No caffeine after 2:00 PM",
        reasoning: "Prevents nervous system activation from interfering with slow-wave rest stages.",
        category: "sleep"
      });
      suggestions.push({
        title: "Hydrate: Eat water-rich foods",
        reasoning: "Aids in stable digestion and cognitive sharpness.",
        category: "eat"
      });
      suggestions.push({
        title: "Stretching sessions after work",
        reasoning: "Decompresses lower back and spine muscles from continuous stress.",
        category: "move"
      });
    }

    const currentHabits = habits;
    // Don't recommend habits that are already in habits list!
    return suggestions.filter(s => !currentHabits.includes(s.title)).slice(0, 3);
  };

  const addHabit = async (habit: string) => {
    if (!user) return;
    if (habits.includes(habit)) return;
    setLoading(true);
    
    const newHabits = [...habits, habit];

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        habitsList: newHabits
      });
    } catch (err) {
      console.error('Failed to add habit:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleHabit = async (habit: string) => {
    if (!user) return;
    setLoading(true);
    
    const isCompleted = completedHabits.includes(habit);
    const newCompleted = isCompleted 
      ? completedHabits.filter(h => h !== habit)
      : [...completedHabits, habit];

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        completedHabits: newCompleted,
        // Also ensure habitsList is initialized if it wasn't
        habitsList: habits
      });
    } catch (err) {
      console.error('Failed to update habit:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="px-6 pt-8 pb-32 max-w-xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-navy active:scale-90 transition-all border border-slate/5"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-navy leading-none">Your Habits</h1>
            <div className="flex items-center gap-3 mt-2 min-w-[200px]">
              <div className="flex-1 h-3 bg-off-white rounded-full overflow-hidden border border-slate/5 relative shadow-inner">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(completedHabits.length / habits.length) * 100}%` }}
                  className="h-full bg-teal transition-all duration-1000 relative"
                >
                   <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.2)_50%,transparent_100%)] animate-[shimmer_2s_infinite]" />
                </motion.div>
              </div>
              <span className="text-[11px] font-black text-teal uppercase tracking-widest leading-none">{completedHabits.length}/{habits.length}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {habits.map((habit, idx) => {
            const isDone = completedHabits.includes(habit);
            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={habit}
              >
                <Card 
                  onClick={() => !loading && toggleHabit(habit)}
                  className={cn(
                    "flex items-center justify-between p-5 border-2 transition-all",
                    isDone ? "border-teal/20 bg-teal/5" : "border-slate/5 hover:border-navy/10"
                  )}
                >
                  <span className={cn(
                    "font-bold text-sm",
                    isDone ? "text-teal line-through opacity-70" : "text-navy"
                  )}>
                    {habit}
                  </span>
                  {isDone ? (
                    <CheckCircle2 size={22} className="text-teal" />
                  ) : (
                    <Circle size={22} className="text-slate/20" />
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Personalized Habits Suggestions Section */}
        <div className="mt-12 mb-8">
          <div className="flex items-center gap-2.5 mb-5">
             <div className="w-8 h-8 rounded-xl bg-violet/10 text-violet flex items-center justify-center">
                <Sparkles size={16} fill="currentColor" />
             </div>
             <h2 className="text-[15px] font-black text-navy uppercase tracking-wider mb-0">Custom AI Recommendations</h2>
          </div>

          {fetchingLogs ? (
             <div className="flex items-center justify-center p-8 text-slate/50 font-bold text-xs gap-2">
                <Loader2 className="animate-spin" size={16} />
                <span>Analyzing Loops & Onboarding...</span>
             </div>
          ) : (
            <div className="space-y-4">
              {getPersonalizedSuggestions().length === 0 ? (
                <div className="p-6 rounded-3xl bg-teal/5 border border-teal/10 text-center">
                  <p className="text-[13px] font-black text-teal uppercase mb-0">🎉 All recommended loops integrated!</p>
                </div>
              ) : (
                getPersonalizedSuggestions().map((suggestion, idx) => (
                  <motion.div
                    key={suggestion.title}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className="p-5 rounded-[28px] bg-white border border-slate/5 shadow-md shadow-navy/2 relative overflow-hidden"
                  >
                     <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-violet/5 to-transparent rounded-bl-full pointer-events-none" />
                     <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                           <div className="flex items-center gap-2 mb-2">
                              <span className={cn(
                                "text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full select-none",
                                suggestion.category === 'sleep' ? "bg-amber/10 text-amber" :
                                suggestion.category === 'eat' ? "bg-teal/10 text-teal" :
                                "bg-violet/10 text-violet"
                              )}>
                                {suggestion.category} Focus
                              </span>
                           </div>
                           <h3 className="font-bold text-[14.5px] text-navy mb-1">{suggestion.title}</h3>
                           <p className="text-[12px] font-medium text-slate/75 leading-relaxed mb-0">
                             {suggestion.reasoning}
                           </p>
                        </div>
                        <button
                          disabled={loading}
                          onClick={() => addHabit(suggestion.title)}
                          className="w-10 h-10 rounded-full bg-violet text-white hover:bg-teal transition-all active:scale-90 flex items-center justify-center shadow-lg shadow-violet/15 shrink-0 self-center"
                          title="Add to My Habits"
                        >
                           <Plus size={18} />
                        </button>
                     </div>
                  </motion.div>
                ))
              )}
            </div>
          )}
        </div>

        <Card className="mt-8 bg-navy text-white border-none p-6 rounded-[32px] overflow-hidden relative">
           <div className="relative z-10">
             <h3 className="text-lg font-black mb-2">Habit Transformation</h3>
             <p className="text-xs text-white/70 leading-relaxed font-medium">
               Studies show that it takes an average of 66 days for a behavior to become automatic. Small daily wins build enormous momentum.
             </p>
           </div>
           <div className="absolute top-0 right-0 w-32 h-32 bg-teal/20 rounded-full blur-3xl -mr-16 -mt-16" />
        </Card>
      </div>
    </Layout>
  );
}
