/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Card, Button } from '../components/UI';
import { useFirebase } from '../contexts/FirebaseContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, addDoc, limit, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { OperationType, handleFirestoreError } from '../lib/firebase';
import { format } from 'date-fns';
import { Zap, Play, CheckCircle2, Trophy, Clock, X, ChevronRight, ChevronLeft, Plus, Trash2, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ActivityLog, GuidedWorkout } from '../types';
import { GUIDED_WORKOUTS } from '../constants';
import { cn } from '../lib/utils';

export function MoveScreen() {
  const { user, profile } = useFirebase();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkout, setSelectedWorkout] = useState<GuidedWorkout | null>(null);
  const [isManualLogOpen, setIsManualLogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<ActivityLog | null>(null);

  // Manual Form State
  const [activityName, setActivityName] = useState('');
  const [duration, setDuration] = useState('30');
  const [intensity, setIntensity] = useState<'light' | 'moderate' | 'hard'>('moderate');

  // Real-time Workout State
  const [workoutStep, setWorkoutStep] = useState(0);
  const [isWorkoutStarted, setIsWorkoutStarted] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const path = 'activityLogs';
    try {
      const q = query(
        collection(db, path),
        where('userId', '==', user.uid),
        orderBy('date', 'desc'),
        limit(20)
      );
      const snap = await getDocs(q);
      const fetchedLogs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityLog));
      setLogs(fetchedLogs);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (isMounted) {
        await fetchLogs();
      }
    };
    load();
    return () => { isMounted = false; };
  }, [fetchLogs]);

  const handleSaveActivity = async () => {
    if (!user) return;

    const logData: Omit<ActivityLog, 'id'> = {
      userId: user.uid,
      date: format(new Date(), 'yyyy-MM-dd'),
      activityName: activityName || (selectedWorkout ? selectedWorkout.title : 'General Exercise'),
      activityType: selectedWorkout ? 'guided' : 'self_logged',
      durationMinutes: parseInt(duration),
      intensity: intensity,
      completedAt: new Date().toISOString()
    };

    const path = 'activityLogs';
    try {
      if (editingLog?.id) {
        await updateDoc(doc(db, path, editingLog.id), logData);
      } else {
        await addDoc(collection(db, path), logData);
      }
      resetForms();
      fetchLogs();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    if (!confirm('Are you sure you want to delete this log?')) return;
    const path = 'activityLogs';
    try {
      await deleteDoc(doc(db, path, logId));
      fetchLogs();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const resetForms = () => {
    setSelectedWorkout(null);
    setIsManualLogOpen(false);
    setEditingLog(null);
    setActivityName('');
    setDuration('30');
    setIntensity('moderate');
    setWorkoutStep(0);
    setIsWorkoutStarted(false);
  };

  const handleEdit = (log: ActivityLog) => {
    setEditingLog(log);
    setActivityName(log.activityName);
    setDuration(log.durationMinutes.toString());
    setIntensity(log.intensity);
    setIsManualLogOpen(true);
  };

  const startWorkout = (workout: GuidedWorkout) => {
    setSelectedWorkout(workout);
    setWorkoutStep(0);
    setIsWorkoutStarted(true);
    setActivityName(workout.title);
    setDuration(workout.durationMinutes.toString());
    setIntensity(workout.energyCost === 'high' ? 'hard' : 'moderate');
  };

  const getWeeklyCount = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diffToMonday = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diffToMonday));
    monday.setHours(0, 0, 0, 0);

    return logs.filter(l => new Date(l.completedAt) >= monday).length;
  };

  const weeklyCount = getWeeklyCount();
  const target = profile?.weeklyActivityTarget || 3;

  return (
    <Layout>
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-[28px] font-black leading-tight text-violet">Move Loop</h1>
          <p className="text-slate font-medium">Earn your momentum.</p>
        </div>
        <button 
          onClick={() => setIsManualLogOpen(true)}
          className="w-10 h-10 rounded-full bg-violet/10 text-violet flex items-center justify-center hover:bg-violet hover:text-white transition-all shadow-sm"
        >
          <Plus size={24} />
        </button>
      </header>

      {/* Goal Tracker */}
      <Card className="mb-8 bg-violet/5 border-l-violet">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
             <Trophy size={18} className="text-violet" />
             <h3 className="font-bold text-navy">Weekly Goal</h3>
          </div>
          <span className="text-[13px] font-black text-violet bg-white px-3 py-1 rounded-full shadow-sm border border-violet/10 lowercase">
            {weeklyCount}/{target} complete
          </span>
        </div>
        
        <div className="flex gap-2 mb-2">
          {Array.from({ length: target }).map((_, i) => (
            <div 
              key={i} 
              className={cn(
                "flex-1 h-3 rounded-full transition-all duration-500",
                i < weeklyCount ? "bg-violet shadow-[0_0_8px_rgba(124,58,237,0.3)]" : "bg-white border border-off-white"
              )}
            />
          ))}
        </div>
      </Card>

      <div className="flex flex-col gap-8 pb-32">
        <section>
          <h3 className="font-bold text-navy uppercase tracking-widest text-[12px] mb-4">Guided Workouts</h3>
          <div className="grid grid-cols-1 gap-4">
            {GUIDED_WORKOUTS.map((workout) => (
              <Card key={workout.title} className="p-0 overflow-hidden border-none group">
                <button 
                  onClick={() => startWorkout(workout)}
                  className="w-full text-left p-5 bg-white hover:bg-violet/5 transition-colors flex items-center justify-between"
                >
                  <div className="flex-1">
                     <span className={cn(
                        "inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-1",
                        workout.energyCost === 'low' ? "bg-teal/10 text-teal" : "bg-amber/10 text-amber"
                     )}>
                       {workout.energyCost} Energy Cost
                     </span>
                     <h4 className="font-black text-xl text-navy leading-none mb-1">{workout.title}</h4>
                     <div className="flex items-center gap-2 text-slate text-[13px] font-medium">
                        <Clock size={14} />
                        {workout.durationMinutes} minutes · {workout.exercises.length} exercises
                     </div>
                  </div>
                  <div className="w-12 h-12 rounded-full border-2 border-violet flex items-center justify-center text-violet group-hover:bg-violet group-hover:text-white transition-all">
                    <Play size={20} className="ml-1 fill-current" />
                  </div>
                </button>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <h3 className="font-bold text-navy uppercase tracking-widest text-[12px] mb-4 px-1">Activity History</h3>
          <div className="flex flex-col gap-3">
             {loading ? (
                <div className="h-20 bg-off-white rounded-card animate-pulse" />
             ) : logs.length === 0 ? (
                <p className="text-center text-slate font-medium py-4 opacity-50">No activities logged yet.</p>
             ) : (
                logs.map(log => (
                  <div key={log.id} className="flex items-center justify-between bg-white border border-off-white rounded-card p-4 hover:shadow-md transition-shadow group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-violet/10 flex items-center justify-center text-violet">
                        <Zap size={20} />
                      </div>
                      <div>
                        <h5 className="font-bold text-navy text-[15px]">{log.activityName}</h5>
                        <span className="text-xs font-medium text-slate uppercase">{format(new Date(log.date), 'MMM d')} · {log.durationMinutes}m · {log.intensity}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <button 
                        onClick={() => handleEdit(log)}
                        className="p-2 text-slate hover:text-navy transition-colors opacity-0 group-hover:opacity-100"
                       >
                         <Edit3 size={18} />
                       </button>
                       <button 
                        onClick={() => handleDeleteLog(log.id!)}
                        className="p-2 text-slate hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                       >
                         <Trash2 size={18} />
                       </button>
                       <CheckCircle2 size={24} className="text-teal/30 group-hover:text-teal/60" />
                    </div>
                  </div>
                ))
             )}
          </div>
        </section>
      </div>

      {/* Manual Log Overlay */}
      <AnimatePresence>
        {isManualLogOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-navy/60 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-0 sm:p-5"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white w-full max-w-[420px] rounded-t-[32px] sm:rounded-[32px] p-8 pb-12 sm:pb-8 flex flex-col gap-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-navy">{editingLog ? 'Edit Activity' : 'Log Activity'}</h2>
                <button onClick={resetForms} className="text-slate p-1"><X /></button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate">Activity Name</label>
                  <input 
                    type="text" 
                    value={activityName}
                    onChange={(e) => setActivityName(e.target.value)}
                    placeholder="e.g. Morning Yoga, Walk"
                    className="w-full h-14 bg-off-white border-2 border-transparent focus:border-violet focus:bg-white rounded-2xl px-5 font-bold transition-all outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate">Duration (min)</label>
                  <input 
                    type="number" 
                    inputMode="numeric"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full h-14 bg-off-white border-2 border-transparent focus:border-violet focus:bg-white rounded-2xl px-5 font-bold transition-all outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate">Intensity</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['light', 'moderate', 'hard'].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setIntensity(opt as 'light' | 'moderate' | 'hard')}
                        className={cn(
                          "h-12 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                          intensity === opt ? "bg-violet text-white" : "bg-off-white text-slate hover:bg-violet/5"
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <Button domain="move" onClick={handleSaveActivity}>
                {editingLog ? 'Update Activity' : 'Save Activity'}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interactive Workout Overlay */}
      <AnimatePresence>
        {selectedWorkout && isWorkoutStarted && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white z-[70] flex flex-col"
          >
             {/* Progress Bar */}
             <div className="w-full h-2 bg-off-white flex">
               {selectedWorkout.exercises.map((_, idx) => (
                 <div 
                   key={idx}
                   className={cn(
                     "flex-1 h-full transition-all duration-500",
                     idx <= workoutStep ? "bg-violet" : "bg-transparent"
                   )}
                 />
               ))}
             </div>

             <div className="p-5 flex justify-between items-center">
                <span className="text-[11px] font-black text-slate uppercase tracking-widest">
                  Workout: {selectedWorkout.title}
                </span>
                <button onClick={resetForms} className="text-slate"><X size={24} /></button>
             </div>

             <main className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <motion.div 
                  key={workoutStep}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="w-full max-w-[320px]"
                >
                  <div className="w-20 h-20 rounded-full bg-violet/10 flex items-center justify-center text-violet font-black text-2xl mx-auto mb-8">
                    {workoutStep + 1}
                  </div>
                  
                  <h2 className="text-4xl font-black text-navy mb-4 leading-tight">
                    {selectedWorkout.exercises[workoutStep].name}
                  </h2>
                  <p className="text-2xl font-black text-violet mb-8">
                    {selectedWorkout.exercises[workoutStep].repOrDuration}
                  </p>
                  
                  <div className="bg-off-white rounded-3xl p-6 text-left">
                    <h5 className="text-[11px] font-black text-slate uppercase tracking-widest mb-3">How to do it:</h5>
                    <p className="text-navy font-medium leading-relaxed">
                      {selectedWorkout.exercises[workoutStep].instructions}
                    </p>
                  </div>
                </motion.div>
             </main>

             <footer className="p-8 pb-12 flex gap-4 w-full max-w-[420px] mx-auto">
                {workoutStep > 0 && (
                  <button 
                    onClick={() => setWorkoutStep(s => s - 1)}
                    className="w-16 h-16 rounded-full border-2 border-off-white flex items-center justify-center text-slate hover:bg-off-white transition-colors"
                  >
                    <ChevronLeft size={24} />
                  </button>
                )}
                
                {workoutStep < selectedWorkout.exercises.length - 1 ? (
                  <Button domain="move" onClick={() => setWorkoutStep(s => s + 1)} className="flex-1">
                    Next Exercise <ChevronRight size={20} className="ml-2" />
                  </Button>
                ) : (
                  <Button domain="move" onClick={handleSaveActivity} className="flex-1">
                    Complete Workout <CheckCircle2 size={20} className="ml-2" />
                  </Button>
                )}
             </footer>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pre-workout Overview (Old Workout Detail Overlay) */}
      <AnimatePresence>
        {selectedWorkout && !isWorkoutStarted && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-navy/95 z-50 flex items-center justify-center p-5 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full rounded-[32px] p-8 max-w-[420px]"
            >
              <div className="text-center mb-8 relative">
                <button onClick={resetForms} className="absolute right-0 top-0 text-slate"><X /></button>
                <span className="text-violet font-black uppercase tracking-[0.2em] text-[12px] block mb-2">Guided Workout</span>
                <h2 className="text-[32px] font-black text-navy leading-tight">{selectedWorkout.title}</h2>
                <p className="text-slate font-medium">{selectedWorkout.durationMinutes} minutes · {selectedWorkout.energyCost} Energy</p>
              </div>

              <div className="space-y-6 mb-10 h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                {selectedWorkout.exercises.map((ex, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-violet/10 flex items-center justify-center text-violet font-black shrink-0">
                      {i + 1}
                    </div>
                    <div>
                      <h5 className="font-bold text-navy leading-none mb-1">{ex.name}</h5>
                      <p className="text-violet font-black text-[13px] mb-1">{ex.repOrDuration}</p>
                      <p className="text-slate text-[13px] font-medium leading-relaxed">{ex.instructions}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button variant="ghost" onClick={resetForms}>Cancel</Button>
                <Button domain="move" onClick={() => setIsWorkoutStarted(true)}>Start Guided Step-by-Step</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
