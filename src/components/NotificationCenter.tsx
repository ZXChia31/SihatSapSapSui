/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useFirebase } from '../contexts/FirebaseContext';
import { motion, AnimatePresence } from 'motion/react';
import { X, Moon, Utensils, Zap, Sparkles, LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { SleepLog, MealLog, ActivityLog } from '../types';
import { generatePatternNudges } from '../lib/scoring';

interface Nudge {
  id: string;
  title: string;
  message: string;
  type: 'sleep' | 'eat' | 'move' | 'ai';
  icon: LucideIcon;
}

export function NotificationCenter() {
  const { profile, user } = useFirebase();
  const [nudge, setNudge] = useState<Nudge | null>(null);

  useEffect(() => {
    if (!profile?.settings?.pushNotifications || !user) return;

    const checkNudges = async () => {
      // Throttle: Don't show more than one nudge every 1 hour
      const lastNudge = localStorage.getItem('last_nudge_timestamp');
      const now = new Date();
      if (lastNudge) {
        const diff = now.getTime() - parseInt(lastNudge);
        if (diff < 60 * 60 * 1000) return; // 1 hour cooldown
      }

      const hour = now.getHours();

      // 1. Fetch recent logs for AI patterns
      try {
        const fetchRecent = async (col: string) => {
          const q = query(
            collection(db, col),
            where('userId', '==', user.uid),
            orderBy('date', 'desc'),
            limit(7)
          );
          const snap = await getDocs(q);
          return snap.docs.map(d => d.data());
        };

        const [sleep, meals, move] = await Promise.all([
          fetchRecent('sleepLogs') as Promise<SleepLog[]>,
          fetchRecent('mealLogs') as Promise<MealLog[]>,
          fetchRecent('activityLogs') as Promise<ActivityLog[]>
        ]);

        const patternNudges = generatePatternNudges(sleep, meals, move);
        // Only 20% chance to show an AI nudge if data exists, to avoid being annoying
        if (patternNudges.length > 0 && Math.random() > 0.8) {
          const p = patternNudges[Math.floor(Math.random() * patternNudges.length)];
          localStorage.setItem('last_nudge_timestamp', Date.now().toString());
          setNudge({
            id: `ai-pattern-${Date.now()}`,
            ...p,
            icon: p.type === 'sleep' ? Moon : p.type === 'eat' ? Utensils : p.type === 'move' ? Zap : Sparkles
          });
          return;
        }
      } catch (err) {
        console.warn('Silent failure in AI nudge generation:', err);
      }

      // 2. Simple fallback rule-based nudges
      if (hour === 21 && profile.settings.sleepAlerts) {
        localStorage.setItem('last_nudge_timestamp', Date.now().toString());
        setNudge({
          id: 'sleep-bedtime',
          title: 'Winding Down?',
          message: `It's 9 PM. Your sleep loop starts soon! Aim for ${profile.sleepTargetHours}h tonight.`,
          type: 'sleep',
          icon: Moon
        });
      } else if (hour === 8 && profile.settings.activityReminders) {
        localStorage.setItem('last_nudge_timestamp', Date.now().toString());
        setNudge({
          id: 'move-morning',
          title: 'Morning Motion',
          message: 'Start your loop with a quick stretch or walk to energize your day.',
          type: 'move',
          icon: Zap
        });
      } else if (hour === 12) {
        localStorage.setItem('last_nudge_timestamp', Date.now().toString());
        setNudge({
          id: 'eat-lunch',
          title: 'Nutritious Fuel',
          message: 'Halfway through the day! Remember to log a healthy protein-rich lunch.',
          type: 'eat',
          icon: Utensils
        });
      }
    };

    checkNudges();
    const interval = setInterval(checkNudges, 60000 * 60); // Every hour
    
    return () => clearInterval(interval);
  }, [profile, user]);

  if (!nudge) return null;

  const typeConfig = {
    sleep: { bg: 'bg-amber', text: 'text-amber' },
    eat: { bg: 'bg-teal', text: 'text-teal' },
    move: { bg: 'bg-violet', text: 'text-violet' },
    ai: { bg: 'bg-navy', text: 'text-yellow' }
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 20, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className="fixed top-20 left-1/2 -translate-x-1/2 w-[calc(100%-40px)] max-w-[380px] z-[100]"
      >
        <div className="bg-white rounded-[24px] shadow-2xl border border-off-white p-5 flex gap-4 relative overflow-hidden group">
          <div className={cn(
            "w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center text-white shadow-lg",
            typeConfig[nudge.type].bg
          )}>
            <nudge.icon size={24} />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start mb-1">
              <h4 className="font-black text-navy text-[15px] leading-tight">{nudge.title}</h4>
              <button onClick={() => setNudge(null)} className="text-slate/40 hover:text-navy p-1">
                <X size={16} />
              </button>
            </div>
            <p className="text-sm font-medium text-slate leading-snug">{nudge.message}</p>
          </div>
          <div className="absolute bottom-0 left-0 h-1 bg-off-white w-full">
            <motion.div 
              initial={{ width: '100%' }}
              animate={{ width: 0 }}
              transition={{ duration: 8, ease: 'linear' }}
              onAnimationComplete={() => setNudge(null)}
              className={cn("h-full", typeConfig[nudge.type].bg)}
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
