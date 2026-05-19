/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Card, Button, ConfirmModal } from '../components/UI';
import { useFirebase } from '../contexts/FirebaseContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, addDoc, limit, updateDoc, deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { OperationType, handleFirestoreError } from '../lib/firebase';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { Moon, Plus, TrendingUp, Smile, Frown, Meh, Trash2, Edit3, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SleepLog } from '../types';
import { calculateSleepScore, calculateOverallScore } from '../lib/scoring';
import { TimePicker } from '../components/TimePicker';
import { AIPatterns } from '../components/AIPatterns';

export function SleepScreen() {
  const { user, profile } = useFirebase();
  const [logs, setLogs] = useState<SleepLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogForm, setShowLogForm] = useState(false);
  const [editingLog, setEditingLog] = useState<SleepLog | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [bedtime, setBedtime] = useState('22:30');
  const [wakeTime, setWakeTime] = useState('06:30');
  const [mood, setMood] = useState(3);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const fetchLogs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const path = 'sleepLogs';
    try {
      const q = query(
        collection(db, path),
        where('userId', '==', user.uid),
        orderBy('date', 'desc'),
        limit(14)
      );
      const snap = await getDocs(q);
      const fetchedLogs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SleepLog));
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

  const updateLoopScore = async (currentDate: string, sleepLog: SleepLog | null) => {
    if (!user || !profile) return;
    try {
      const scoreId = `${user.uid}_${currentDate}`;
      const scoreRef = doc(db, 'loopScores', scoreId);
      const scoreSnap = await getDoc(scoreRef);
      
      const newSleepScore = sleepLog ? calculateSleepScore(sleepLog, profile) : 0;
      
      if (scoreSnap.exists()) {
        const scoreData = scoreSnap.data();
        const newOverall = calculateOverallScore({
          sleepScore: newSleepScore,
          eatScore: scoreData.eatScore || 0,
          moveScore: scoreData.moveScore || 0
        });
        await updateDoc(scoreRef, {
          sleepScore: Math.round(newSleepScore),
          overallScore: Math.round(newOverall),
          computedAt: new Date().toISOString()
        });
      } else {
        // Create new score doc if it doesn't exist
        const newOverall = calculateOverallScore({
          sleepScore: newSleepScore,
          eatScore: 0,
          moveScore: 0
        });
        await setDoc(scoreRef, {
          userId: user.uid,
          date: currentDate,
          sleepScore: Math.round(newSleepScore),
          eatScore: 0,
          moveScore: 0,
          overallScore: Math.round(newOverall),
          computedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.warn('Failed to update loop score after sleep change:', err);
    }
  };

  const calculateHours = (start: string, end: string) => {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    let diff = (endH * 60 + endM) - (startH * 60 + startM);
    if (diff < 0) diff += 24 * 60;
    return diff / 60;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);

    // Date validation
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate > today) {
      setError("You cannot log sleep for a future date.");
      return;
    }

    const hours = calculateHours(bedtime, wakeTime);
    
    // Duration validation
    if (hours === 0) {
      setError("Bedtime and wake time cannot be the same. Please enter a valid duration.");
      return;
    }

    if (hours < 0.25) { // 15 mins
      setError("Sleep session must be at least 15 minutes long.");
      return;
    }

    if (hours > 18) {
      setError("Please check your times. A single sleep session cannot exceed 18 hours in this app.");
      return;
    }

    const logData: Omit<SleepLog, 'id'> = {
      userId: user.uid,
      date,
      bedtime,
      wakeTime,
      hoursSlept: hours,
      moodRating: mood,
      loggedAt: new Date().toISOString()
    };

    const path = 'sleepLogs';
    try {
      if (editingLog?.id) {
        await updateDoc(doc(db, path, editingLog.id), logData);
      } else {
        await addDoc(collection(db, path), logData);
      }
      
      await updateLoopScore(date, logData as SleepLog);
      
      resetForm();
      fetchLogs();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const handleDelete = async (id: string) => {
    const logToDelete = logs.find(l => l.id === id);
    if (!logToDelete) return;

    const path = 'sleepLogs';
    try {
      await deleteDoc(doc(db, path, id));
      setLogs(prev => prev.filter(log => log.id !== id));
      
      await updateLoopScore(logToDelete.date, null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const handleEdit = (log: SleepLog) => {
    setEditingLog(log);
    setDate(log.date);
    setBedtime(log.bedtime);
    setWakeTime(log.wakeTime);
    setMood(log.moodRating);
    setShowLogForm(true);
  };

  const resetForm = () => {
    setShowLogForm(false);
    setEditingLog(null);
    setBedtime('22:30');
    setWakeTime('06:30');
    setMood(3);
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setError(null);
  };

  const getMoodIcon = (rating: number) => {
    if (rating >= 4) return <Smile size={20} className="text-teal" />;
    if (rating <= 2) return <Frown size={20} className="text-coral" />;
    return <Meh size={20} className="text-amber" />;
  };

  return (
    <Layout>
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-[28px] font-black leading-tight text-amber">Sleep Loop</h1>
          <p className="text-slate font-medium">Keep your rhythm steady.</p>
        </div>
        <Button 
          variant="primary" 
          domain="sleep" 
          fullWidth={false} 
          className="h-12 w-12 rounded-full p-0"
          onClick={() => setShowLogForm(true)}
        >
          <Plus size={24} />
        </Button>
      </header>

      <div className="mb-8">
        <AIPatterns userId={user?.uid || ''} domain="Sleep" logs={logs} profile={profile} />
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Weekly Trend Card */}
        <Card className="bg-white border-none shadow-lifted p-6 rounded-[32px] overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />
          <div className="flex items-center gap-2 mb-6 relative z-10">
            <TrendingUp size={18} className="text-amber" />
            <h3 className="text-[11px] font-black text-amber uppercase tracking-[0.2em]">Weekly Consistency</h3>
          </div>
          <div className="flex items-baseline gap-2 mb-2 relative z-10">
            <span className="text-[48px] font-black text-navy leading-none">
              {logs.length > 0 ? (logs.reduce((acc, l) => acc + l.hoursSlept, 0) / logs.length).toFixed(1) : '0.0'}
            </span>
            <span className="text-[18px] font-black text-slate/40 uppercase tracking-tight">Hrs / Sleep Session</span>
          </div>
          <div className="w-full h-2 bg-off-white rounded-full overflow-hidden relative z-10">
            <motion.div 
               initial={{ width: 0 }}
               animate={{ width: `${Math.min(100, (logs.reduce((acc, l) => acc + l.hoursSlept, 0) / (logs.length || 1)) / (profile?.sleepTarget || 8) * 100)}%` }}
               className="h-full bg-amber shadow-[0_0_12px_rgba(255,193,7,0.3)]"
            />
          </div>
          <p className="text-[10px] font-bold text-slate uppercase tracking-widest mt-4 opacity-60 relative z-10">
            {logs.length > 0 ? 'Tracking steady rhythm' : 'Start logging to see trends'}
          </p>
        </Card>

        {/* Logs List */}
        <div className="flex flex-col gap-3 pb-10">
          <h3 className="font-bold text-navy uppercase tracking-widest text-[12px] mb-1">Recent Logs</h3>
          {loading ? (
            [1, 2, 3].map(i => <div key={i} className="h-[72px] bg-off-white rounded-card animate-pulse" />)
          ) : logs.length === 0 ? (
            <div className="text-center py-10">
              <Moon size={48} className="mx-auto text-amber/20 mb-4" />
              <p className="text-slate font-medium">No sleep logs yet.</p>
              <button 
                 onClick={() => setShowLogForm(true)}
                 className="text-amber font-bold text-sm mt-2 underline"
              >
                Record your first sleep
              </button>
            </div>
          ) : (
            logs.map((log) => (
              <Card key={log.id} className="flex items-center justify-between p-5 border-none shadow-sm hover:shadow-md transition-all active:scale-[0.99] group overflow-hidden relative">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber/20 group-hover:bg-amber transition-colors" />
                <div className="flex flex-col gap-1">
                  <span className="font-black text-navy text-[16px] tracking-tight">{format(new Date(log.date), 'EEEE, MMM d')}</span>
                  <div className="flex items-center gap-2 text-slate text-xs font-bold uppercase tracking-wider opacity-60">
                    <Moon size={12} />
                    {log.bedtime} - {log.wakeTime}
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="flex items-baseline gap-0.5 justify-end">
                      <span className="font-black text-navy text-2xl leading-none">{log.hoursSlept.toFixed(1)}</span>
                      <span className="text-[10px] font-black text-slate/40 uppercase">h</span>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-off-white flex items-center justify-center group-hover:bg-amber/10 transition-colors">
                    {getMoodIcon(log.moodRating)}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => {  e.stopPropagation(); handleEdit(log); }} 
                      className="p-2 text-slate hover:text-navy"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(log.id!); }} 
                      className="p-2 text-slate hover:text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      <ConfirmModal 
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        title="Delete Sleep Log"
        message="Are you sure you want to remove this sleep record? This will affect your Loop score for that day."
      />

      {/* Log Form Overlay */}
      <AnimatePresence>
        {showLogForm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={resetForm}
            className="fixed inset-0 bg-navy/60 z-50 flex items-end justify-center p-0 sm:p-5 backdrop-blur-sm cursor-pointer"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full rounded-t-[32px] sm:rounded-[24px] p-8 pb-10 max-w-[420px] max-h-[95vh] overflow-y-auto cursor-default"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-amber">{editingLog ? 'Edit Sleep' : 'Record Sleep'}</h2>
                <button onClick={resetForm} className="text-slate p-1 hover:bg-off-white rounded-full transition-colors"><X size={24} /></button>
              </div>

              <form onSubmit={handleSave} className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-black tracking-widest text-slate uppercase">Date</label>
                  <input 
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-14 bg-off-white border-2 border-transparent focus:border-amber focus:bg-white rounded-2xl px-5 font-bold transition-all outline-none"
                  />
                </div>

                <div className="flex flex-col gap-4">
                  <div className="relative h-24 bg-off-white rounded-[24px] mb-2 flex flex-col items-center justify-center overflow-hidden border border-slate/5 shadow-inner">
                    <div className="absolute inset-x-0 top-0 h-1 flex justify-between px-2">
                       {[0, 6, 12, 18, 24].map(h => (
                         <div key={h} className="w-px h-full bg-slate/10 relative">
                           <span className="absolute top-1.5 left-1/2 -translate-x-1/2 text-[8px] font-bold text-slate/30">{h}:00</span>
                         </div>
                       ))}
                    </div>
                    
                    <div className="absolute inset-x-4 h-2 bg-slate/10 rounded-full top-8 overflow-hidden">
                       {(() => {
                         const startMin = parseInt(bedtime.split(':')[0]) * 60 + parseInt(bedtime.split(':')[1]);
                         const endMin = parseInt(wakeTime.split(':')[0]) * 60 + parseInt(wakeTime.split(':')[1]);
                         const duration = calculateHours(bedtime, wakeTime);
                         
                         if (startMin <= endMin) {
                           // Same day
                           return (
                             <motion.div 
                               initial={false}
                               animate={{ 
                                 left: `${(startMin / (24 * 60)) * 100}%`,
                                 width: `${(duration / 24) * 100}%`
                               }}
                               className="absolute inset-y-0 bg-amber rounded-full shadow-[0_0_12px_rgba(255,193,7,0.4)]"
                             />
                           );
                         } else {
                           // Wraps around midnight
                           return (
                             <>
                               <motion.div 
                                 initial={false}
                                 animate={{ 
                                   left: `${(startMin / (24 * 60)) * 100}%`,
                                   width: `${((24 * 60 - startMin) / (24 * 60)) * 100}%`
                                 }}
                                 className="absolute inset-y-0 bg-amber"
                               />
                               <motion.div 
                                 initial={false}
                                 animate={{ 
                                   left: '0%',
                                   width: `${(endMin / (24 * 60)) * 100}%`
                                 }}
                                 className="absolute inset-y-0 bg-amber"
                               />
                             </>
                           );
                         }
                       })()}
                    </div>

                    <div className="mt-8 flex flex-col items-center relative z-10">
                      <span className="text-[28px] font-black text-navy leading-none">{calculateHours(bedtime, wakeTime).toFixed(1)}</span>
                      <span className="text-[10px] font-black text-slate/50 uppercase tracking-[0.2em] mt-1">Hrs Sleep Session</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-black tracking-widest text-slate uppercase px-1">Session Start</label>
                    <TimePicker 
                      value={bedtime}
                      onChange={setBedtime}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-black tracking-widest text-slate uppercase px-1">Session End</label>
                    <TimePicker 
                      value={wakeTime}
                      onChange={setWakeTime}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-black tracking-widest text-slate uppercase">Session Mood</label>
                  <div className="flex justify-between gap-2">
                    {[1, 2, 3, 4, 5].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMood(m)}
                        className={cn(
                          "flex-1 h-[56px] rounded-radius-button border-2 flex items-center justify-center text-xl transition-all",
                          mood === m ? "bg-amber border-amber text-white" : "border-off-white bg-off-white text-slate"
                        )}
                      >
                        {m === 1 && '😫'}
                        {m === 2 && '😕'}
                        {m === 3 && '😐'}
                        {m === 4 && '🙂'}
                        {m === 5 && '🤩'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3">
                  <AnimatePresence>
                    {error && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0, y: -10 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -10 }}
                        className="p-4 bg-coral/10 border border-coral/20 rounded-2xl flex items-center gap-3 overflow-hidden mb-2"
                      >
                        <div className="w-6 h-6 rounded-full bg-coral text-white flex items-center justify-center shrink-0">
                          <X size={14} />
                        </div>
                        <p className="text-navy text-xs font-bold leading-tight">{error}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <Button type="submit" domain="sleep">
                    {editingLog ? 'Update Sleep' : 'Log Sleep'}
                  </Button>
                  <Button type="button" variant="ghost" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
