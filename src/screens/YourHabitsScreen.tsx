import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirebase } from '../contexts/FirebaseContext';
import { Layout } from '../components/Layout';
import { Card } from '../components/UI';
import { ArrowLeft, CheckCircle2, Circle } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function YourHabitsScreen() {
  const { profile, user } = useFirebase();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

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
