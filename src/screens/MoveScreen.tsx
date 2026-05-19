/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Card, Button, ConfirmModal } from '../components/UI';
import { useFirebase } from '../contexts/FirebaseContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, addDoc, limit, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { OperationType, handleFirestoreError } from '../lib/firebase';
import { format } from 'date-fns';
import { Zap, CheckCircle2, Trophy, X, ChevronRight, ChevronLeft, Plus, Trash2, Edit3, Dumbbell, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ActivityLog, GuidedWorkout } from '../types';
import { calculateMoveScore, calculateOverallScore } from '../lib/scoring';
import { GUIDED_WORKOUTS } from '../constants';
import { cn } from '../lib/utils';
import { AIPatterns } from '../components/AIPatterns';
import { getDoc, setDoc } from 'firebase/firestore';

export function MoveScreen() {
  const { user, profile } = useFirebase();
  const navigate = useNavigate();
  const location = useLocation();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkout, setSelectedWorkout] = useState<GuidedWorkout | null>(null);
  const [isManualLogOpen, setIsManualLogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<ActivityLog | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Manual Form State
  const [activityName, setActivityName] = useState('');
  const [duration, setDuration] = useState('30');
  const [intensity, setIntensity] = useState<'light' | 'moderate' | 'hard'>('moderate');
  const [moodRating, setMoodRating] = useState(3);
  const [energyLevel, setEnergyLevel] = useState(3);

  // Real-time Workout State
  const [workoutStep, setWorkoutStep] = useState(0);
  const [isWorkoutStarted, setIsWorkoutStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Timer parsing helper
  const getDurationInSeconds = useCallback((repOrDuration: string) => {
    const secondsMatch = repOrDuration.match(/(\d+)\s*seconds?/i);
    const minuteMatch = repOrDuration.match(/(\d+)\s*minutes?/i);
    if (secondsMatch) return parseInt(secondsMatch[1]);
    if (minuteMatch) return parseInt(minuteMatch[1]) * 60;
    return null;
  }, []);

  const handleStepChange = useCallback((newStep: number) => {
    if (!selectedWorkout) return;
    setWorkoutStep(newStep);
    
    const exercise = selectedWorkout.exercises[newStep];
    const duration = getDurationInSeconds(exercise.repOrDuration);
    
    setTimeLeft(duration);
    setIsTimerRunning(!!duration);
  }, [selectedWorkout, getDurationInSeconds]);

  // Effect to manage the countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timeLeft !== null && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => (prev !== null ? prev - 1 : null));
      }, 1000);
    } else if (timeLeft === 0 && isTimerRunning) {
      // Auto advance to next step or complete
      setTimeout(() => setIsTimerRunning(false), 0);
      setTimeout(() => {
        if (selectedWorkout && workoutStep < selectedWorkout.exercises.length - 1) {
          handleStepChange(workoutStep + 1);
        }
      }, 1500); // 1.5s delay for a smooth transition after finishing a set
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft, workoutStep, selectedWorkout, handleStepChange]);

  const startWorkout = useCallback((workout: GuidedWorkout) => {
    setSelectedWorkout(workout);
    setWorkoutStep(0);
    setIsWorkoutStarted(true);
    setActivityName(workout.title);
    setDuration(workout.durationMinutes.toString());
    setIntensity(workout.energyCost === 'high' ? 'hard' : 'moderate');
    
    // Initialize timer for first step
    const exercise = workout.exercises[0];
    const initialDuration = getDurationInSeconds(exercise.repOrDuration);
    setTimeLeft(initialDuration);
    setIsTimerRunning(!!initialDuration);
  }, [getDurationInSeconds]);

  // Check for auto-start workout from navigation state
  useEffect(() => {
    const checkAutoStart = async () => {
      if (location.state?.startWorkout) {
        const workoutTitle = location.state.startWorkout;
        const workout = GUIDED_WORKOUTS.find(w => w.title === workoutTitle);
        if (workout) {
          startWorkout(workout);
          // Clear state so it doesn't re-trigger on refresh
          navigate(location.pathname, { replace: true, state: {} });
        }
      }
    };
    checkAutoStart();
  }, [location, navigate, startWorkout]);

  const fetchLogs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const path = 'activityLogs';
    try {
      const q = query(
        collection(db, path),
        where('userId', '==', user.uid),
        orderBy('date', 'desc'),
        limit(50)
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

  const updateLoopScore = async (currentDate: string, updatedLogs: ActivityLog[]) => {
    if (!user || !profile) return;
    try {
      const scoreId = `${user.uid}_${currentDate}`;
      const scoreRef = doc(db, 'loopScores', scoreId);
      const scoreSnap = await getDoc(scoreRef);
      
      const todayLogs = updatedLogs.filter(l => l.date === currentDate);
      
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const weeklyLogs = updatedLogs.filter(l => new Date(l.completedAt) >= sevenDaysAgo);
      
      const newMoveScore = calculateMoveScore(todayLogs, weeklyLogs, profile);
      
      if (scoreSnap.exists()) {
        const scoreData = scoreSnap.data();
        const newOverall = calculateOverallScore({
          sleepScore: scoreData.sleepScore || 0,
          eatScore: scoreData.eatScore || 0,
          moveScore: newMoveScore
        });
        await updateDoc(scoreRef, {
          moveScore: Math.round(newMoveScore),
          overallScore: Math.round(newOverall),
          computedAt: new Date().toISOString()
        });
      } else {
        const newOverall = calculateOverallScore({
          sleepScore: 0,
          eatScore: 0,
          moveScore: newMoveScore
        });
        await setDoc(scoreRef, {
          userId: user.uid,
          date: currentDate,
          sleepScore: 0,
          eatScore: 0,
          moveScore: Math.round(newMoveScore),
          overallScore: Math.round(newOverall),
          computedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.warn('Failed to update loop score after activity change:', err);
    }
  };

  const handleSaveActivity = async () => {
    if (!user) return;

    const logDate = format(new Date(), 'yyyy-MM-dd');
    const logData: Omit<ActivityLog, 'id'> = {
      userId: user.uid,
      date: logDate,
      activityName: activityName || (selectedWorkout ? selectedWorkout.title : 'General Exercise'),
      activityType: selectedWorkout ? 'guided' : 'self_logged',
      durationMinutes: parseInt(duration),
      intensity: intensity,
      moodRating: moodRating,
      energyLevel: energyLevel,
      completedAt: new Date().toISOString()
    };

    const path = 'activityLogs';
    try {
      let docId = editingLog?.id;
      if (docId) {
        await updateDoc(doc(db, path, docId), logData);
      } else {
        const res = await addDoc(collection(db, path), logData);
        docId = res.id;
      }
      
      const newLog = { id: docId, ...logData } as ActivityLog;
      const updatedLogs = editingLog?.id 
        ? logs.map(l => l.id === editingLog.id ? newLog : l)
        : [newLog, ...logs];
      
      await updateLoopScore(logDate, updatedLogs);
      
      resetForms();
      fetchLogs();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    const logToDelete = logs.find(l => l.id === logId);
    if (!logToDelete) return;

    const path = 'activityLogs';
    try {
      await deleteDoc(doc(db, path, logId));
      const updatedLogs = logs.filter(log => log.id !== logId);
      setLogs(updatedLogs);

      await updateLoopScore(logToDelete.date, updatedLogs);
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
    setMoodRating(3);
    setEnergyLevel(3);
    setWorkoutStep(0);
    setIsWorkoutStarted(false);
  };

  const handleEdit = (log: ActivityLog) => {
    setEditingLog(log);
    setActivityName(log.activityName);
    setDuration(log.durationMinutes.toString());
    setIntensity(log.intensity);
    setMoodRating(log.moodRating || 3);
    setEnergyLevel(log.energyLevel || 3);
    setIsManualLogOpen(true);
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

      <div className="mb-8">
        <AIPatterns userId={user?.uid || ''} domain="Move" logs={logs} profile={profile} />
      </div>

      <div className="flex flex-col gap-8 pb-32">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-navy uppercase tracking-widest text-[12px]">Guided Workouts</h3>
            <button 
              onClick={() => navigate('/workouts')}
              className="text-violet font-black text-[12px] flex items-center gap-1 hover:underline"
            >
              See All <ChevronRight size={14} />
            </button>
          </div>
          <Card className="p-0 overflow-hidden border-none shadow-md">
            <button 
              onClick={() => navigate('/workouts')}
              className="w-full flex items-center gap-4 p-5 bg-white hover:bg-violet/5 transition-all text-left"
            >
              <div className="w-14 h-14 rounded-[20px] bg-violet/10 text-violet flex items-center justify-center shrink-0">
                <Dumbbell size={28} />
              </div>
              <div className="flex-1">
                <h4 className="font-black text-xl text-navy leading-tight">Explore Guided Routines</h4>
                <p className="text-slate text-[13px] font-medium leading-normal">Choose from 10, 20, or 30-minute tailored sessions.</p>
              </div>
              <div className="w-10 h-10 rounded-full border border-off-white flex items-center justify-center text-slate">
                <ChevronRight size={20} />
              </div>
            </button>
          </Card>
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
                        <span className="text-xs font-medium text-slate uppercase">
                          {format(new Date(log.date), 'MMM d')} · {log.durationMinutes}m · {log.intensity} {log.moodRating && `· Mood: ${log.moodRating}`} {log.energyLevel && `· Energy: ${log.energyLevel}`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 relative z-30 transition-all">
                       <button 
                         onClick={(e) => { 
                           e.preventDefault();
                           e.stopPropagation(); 
                           handleEdit(log); 
                         }}
                         className="w-10 h-10 flex items-center justify-center text-slate hover:text-navy hover:bg-navy/5 rounded-full transition-all cursor-pointer pointer-events-auto"
                         title="Edit Activity"
                       >
                         <Edit3 size={18} />
                       </button>
                       <button 
                         onClick={(e) => { 
                           e.preventDefault();
                           e.stopPropagation(); 
                           setConfirmDeleteId(log.id!); 
                         }}
                         className="w-10 h-10 flex items-center justify-center text-slate hover:text-red-500 hover:bg-red-50 rounded-full transition-all cursor-pointer pointer-events-auto"
                         title="Delete Activity"
                       >
                         <Trash2 size={18} />
                       </button>
                       <div className="ml-1 w-8 h-8 flex items-center justify-center text-teal/40">
                         <CheckCircle2 size={24} />
                       </div>
                    </div>
                  </div>
                ))
             )}
          </div>
        </section>
      </div>

      <ConfirmModal 
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => confirmDeleteId && handleDeleteLog(confirmDeleteId)}
        title="Delete Activity"
        message="Are you sure you want to delete this activity log? This will update your weekly Move targets."
      />

      {/* Manual Log Overlay */}
      <AnimatePresence>
        {isManualLogOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={resetForms}
            className="fixed inset-0 bg-navy/60 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-0 sm:p-5 cursor-pointer"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-[420px] rounded-t-[32px] sm:rounded-[32px] p-8 pb-12 sm:pb-8 flex flex-col gap-6 cursor-default max-h-[95vh] overflow-y-auto"
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

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate">Post-Activity Mood</label>
                  <div className="flex justify-between gap-1">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        key={num}
                        onClick={() => setMoodRating(num)}
                        className={cn(
                          "flex-1 h-12 rounded-xl transition-all flex items-center justify-center text-lg",
                          moodRating === num ? "bg-violet text-white scale-110 shadow-lg shadow-violet/20" : "bg-off-white text-slate grayscale opacity-60"
                        )}
                      >
                        {['😫', '😕', '😐', '😊', '🤩'][num-1]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate">Post-Activity Energy</label>
                  <div className="flex justify-between gap-1">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        key={num}
                        onClick={() => setEnergyLevel(num)}
                        className={cn(
                          "flex-1 h-12 rounded-xl transition-all flex items-center justify-center font-black",
                          energyLevel === num ? "bg-teal text-white scale-110 shadow-lg shadow-teal/20" : "bg-off-white text-slate opacity-60"
                        )}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button domain="move" onClick={handleSaveActivity}>
                  {editingLog ? 'Update Activity' : 'Save Activity'}
                </Button>
                <Button type="button" variant="ghost" onClick={resetForms}>
                  Cancel
                </Button>
              </div>
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

             <div className="p-5 flex justify-between items-center bg-white border-b border-off-white">
                <span className="text-[11px] font-black text-slate uppercase tracking-widest">
                  Workout: {selectedWorkout.title}
                </span>
                <button onClick={resetForms} className="text-slate hover:text-navy transition-colors"><X size={24} /></button>
             </div>
             <main className="flex-1 flex flex-col items-center justify-start p-8 text-center overflow-y-auto bg-off-white/10 pt-16 pb-20">
                <motion.div 
                  key={workoutStep}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="w-full max-w-sm flex flex-col items-center min-h-max"
                >
                  <div className="w-20 h-20 rounded-full bg-violet text-white flex items-center justify-center font-black text-2xl mb-8 shadow-xl shadow-violet/20">
                    {workoutStep + 1}
                  </div>
                  
                  <h2 className="text-4xl font-black text-navy mb-2 tracking-tight leading-none">
                    {selectedWorkout.exercises[workoutStep].name}
                  </h2>
                  <p className="text-[13px] font-black text-violet mb-10 uppercase tracking-[0.2em] opacity-80">
                    {selectedWorkout.exercises[workoutStep].repOrDuration}
                  </p>

                  {timeLeft !== null && (
                    <div className="mb-12 flex flex-col items-center justify-center relative">
                      <div className="w-56 h-56 rounded-full bg-white flex items-center justify-center relative shadow-2xl shadow-navy/5 border-2 border-off-white">
                        <svg className="absolute inset-0 w-full h-full -rotate-90 scale-[1.05]">
                           <circle 
                             cx="112" cy="112" r="106" 
                             fill="none" 
                             stroke="currentColor" 
                             strokeWidth="8"
                             strokeLinecap="round"
                             className="text-violet transition-all duration-1000 ease-linear"
                             strokeDasharray={666}
                             strokeDashoffset={666 - (666 * (timeLeft / (getDurationInSeconds(selectedWorkout.exercises[workoutStep].repOrDuration) || 1)))}
                           />
                        </svg>
                        <div className="flex flex-col items-center relative z-10">
                          <span className="text-7xl font-black text-navy leading-none tabular-nums tracking-tighter">{timeLeft}</span>
                          <span className="text-[10px] font-black text-slate uppercase tracking-widest mt-2 opacity-40">Seconds Left</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="bg-white border border-violet/10 rounded-[32px] p-8 text-center w-full shadow-2xl shadow-navy/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-violet/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />
                    <div className="flex flex-col items-center gap-3 relative z-10">
                      <div className="flex items-center gap-2 px-3 py-1 bg-violet/10 rounded-full">
                        <Dumbbell size={14} className="text-violet" />
                        <h5 className="text-[9px] font-black text-violet uppercase tracking-[0.2em]">Technique Guide</h5>
                      </div>
                      <p className="text-navy font-bold leading-relaxed text-[16px] max-w-[280px]">
                        {selectedWorkout.exercises[workoutStep].instructions}
                      </p>
                    </div>
                  </div>

                  {/* Workout Controls below Technique Guide */}
                  <div className="flex flex-col items-center gap-6 mt-10 w-full">
                    <div className="flex items-center justify-center gap-4 w-full">
                      <button 
                        onClick={() => setIsTimerRunning(!isTimerRunning)}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black uppercase text-[12px] tracking-widest transition-all active:scale-95 shadow-lg",
                          isTimerRunning 
                            ? "bg-white text-navy border border-off-white hover:bg-off-white" 
                            : "bg-teal text-white shadow-teal/20 hover:bg-teal/90"
                        )}
                      >
                        {isTimerRunning ? 'Pause Step' : 'Resume Step'}
                      </button>
                      
                      <button 
                        onClick={() => handleStepChange(workoutStep)}
                        className="w-14 h-14 rounded-2xl bg-off-white text-slate flex items-center justify-center hover:bg-slate/10 transition-all active:scale-95 border border-slate/5"
                        title="Restart Step"
                      >
                        <RefreshCw size={22} />
                      </button>

                      <button 
                        onClick={resetForms}
                        className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-all active:scale-95 border border-red-100"
                        title="Stop Workout"
                      >
                        <X size={22} />
                      </button>
                    </div>
                    
                    <p className="text-[10px] font-black text-slate/40 uppercase tracking-[0.2em]">Session Controls</p>
                  </div>
                </motion.div>
              </main>

             <footer className="p-8 pb-12 flex gap-4 w-full max-w-[420px] mx-auto bg-white border-t border-off-white/50">
                {workoutStep > 0 && (
                  <button 
                    onClick={() => handleStepChange(workoutStep - 1)}
                    className="w-16 h-16 rounded-full border-2 border-off-white flex items-center justify-center text-slate hover:bg-off-white transition-colors"
                  >
                    <ChevronLeft size={24} />
                  </button>
                )}
                
                {workoutStep < selectedWorkout.exercises.length - 1 ? (
                  <Button domain="move" onClick={() => handleStepChange(workoutStep + 1)} className="flex-1">
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
            onClick={resetForms}
            className="fixed inset-0 bg-navy/95 z-50 flex items-center justify-center p-5 overflow-y-auto cursor-pointer"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full rounded-[32px] p-8 max-w-[420px] cursor-default"
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
                <Button domain="move" onClick={() => {
                  setIsWorkoutStarted(true);
                  if (selectedWorkout) {
                    const initialDuration = getDurationInSeconds(selectedWorkout.exercises[0].repOrDuration);
                    setTimeLeft(initialDuration);
                    setIsTimerRunning(!!initialDuration);
                  }
                }}>Start Guided Step-by-Step</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
