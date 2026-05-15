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
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { Moon, Plus, TrendingUp, Smile, Frown, Meh, Trash2, Edit3, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SleepLog } from '../types';

export function SleepScreen() {
  const { user } = useFirebase();
  const [logs, setLogs] = useState<SleepLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogForm, setShowLogForm] = useState(false);
  const [editingLog, setEditingLog] = useState<SleepLog | null>(null);

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

    const hours = calculateHours(bedtime, wakeTime);
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
      resetForm();
      fetchLogs();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this sleep log?')) return;
    const path = 'sleepLogs';
    try {
      await deleteDoc(doc(db, path, id));
      fetchLogs();
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

      <div className="grid grid-cols-1 gap-6">
        {/* Weekly Trend Card */}
        <Card className="bg-amber/5 border-l-amber">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-amber" />
            <h3 className="font-bold text-navy">Weekly Consistency</h3>
          </div>
          <div className="text-[32px] font-black text-navy leading-none mb-1">
            {logs.length > 0 ? (logs.reduce((acc, l) => acc + l.hoursSlept, 0) / logs.length).toFixed(1) : '0'}h
          </div>
          <p className="text-slate text-sm font-medium">Average sleep duration</p>
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
                Record your first night
              </button>
            </div>
          ) : (
            logs.map((log) => (
              <Card key={log.id} className="flex items-center justify-between py-3 px-4 h-auto min-h-[72px] group">
                <div className="flex flex-col">
                  <span className="font-bold text-navy text-[15px]">{format(new Date(log.date), 'EEE, MMM d')}</span>
                  <span className="text-slate text-[13px] font-medium">{log.bedtime} - {log.wakeTime}</span>
                </div>
                <div className="flex items-center gap-3">
                   <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(log)} className="p-2 text-slate hover:text-navy"><Edit3 size={18} /></button>
                      <button onClick={() => handleDelete(log.id!)} className="p-2 text-slate hover:text-red-500"><Trash2 size={18} /></button>
                   </div>
                  <div className="text-right">
                    <span className="block font-black text-navy text-[17px] leading-tight">{log.hoursSlept.toFixed(1)}h</span>
                    <span className="text-[11px] font-bold text-slate uppercase">Slept</span>
                  </div>
                  {getMoodIcon(log.moodRating)}
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Log Form Overlay */}
      <AnimatePresence>
        {showLogForm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-navy/60 z-50 flex items-end justify-center p-0 sm:p-5 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white w-full rounded-t-[32px] sm:rounded-[24px] p-8 pb-10 max-w-[420px]"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-amber">{editingLog ? 'Edit Night' : 'Record Night'}</h2>
                <button onClick={resetForm} className="text-slate"><X /></button>
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

                <div className="flex gap-3">
                  <div className="flex-1 flex flex-col gap-2">
                    <label className="text-[11px] font-black tracking-widest text-slate uppercase">Bedtime</label>
                    <input 
                      type="time" 
                      value={bedtime}
                      onChange={(e) => setBedtime(e.target.value)}
                      className="h-14 bg-off-white border-2 border-transparent focus:border-amber focus:bg-white rounded-2xl px-5 font-bold transition-all outline-none"
                    />
                  </div>
                  <div className="flex-1 flex flex-col gap-2">
                    <label className="text-[11px] font-black tracking-widest text-slate uppercase">Wake Up</label>
                    <input 
                      type="time" 
                      value={wakeTime}
                      onChange={(e) => setWakeTime(e.target.value)}
                      className="h-14 bg-off-white border-2 border-transparent focus:border-amber focus:bg-white rounded-2xl px-5 font-bold transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-black tracking-widest text-slate uppercase">Waking Mood</label>
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

                <div className="mt-4">
                  <Button type="submit" domain="sleep">
                    {editingLog ? 'Update Night' : 'Log Night'}
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
