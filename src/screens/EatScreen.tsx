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
import { Utensils, Plus, Info, Apple, ChefHat, Trash2, Edit3, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MealLog, MealSlot } from '../types';
import { cn } from '../lib/utils';

export function EatScreen() {
  const { user } = useFirebase();
  const [logs, setLogs] = useState<MealLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogForm, setShowLogForm] = useState(false);
  const [editingLog, setEditingLog] = useState<MealLog | null>(null);

  // Form State
  const [mealName, setMealName] = useState('');
  const [slot, setSlot] = useState<MealSlot>('breakfast');
  const [nutrition, setNutrition] = useState({ protein: 3, fat: 3, fibre: 3 });
  const [overall, setOverall] = useState(3);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const fetchLogs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const path = 'mealLogs';
    try {
      const q = query(
        collection(db, path),
        where('userId', '==', user.uid),
        orderBy('date', 'desc'),
        limit(20)
      );
      const snap = await getDocs(q);
      const fetchedLogs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MealLog));
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !mealName.trim()) return;

    const logData: Omit<MealLog, 'id'> = {
      userId: user.uid,
      date,
      mealName,
      mealSlot: slot,
      proteinRating: nutrition.protein,
      fatRating: nutrition.fat,
      fibreRating: nutrition.fibre,
      overallHealthRating: overall,
      loggedAt: new Date().toISOString()
    };

    const path = 'mealLogs';
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
    if (!confirm('Delete this meal?')) return;
    const path = 'mealLogs';
    try {
      await deleteDoc(doc(db, path, id));
      fetchLogs();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const handleEdit = (log: MealLog) => {
    setEditingLog(log);
    setMealName(log.mealName);
    setSlot(log.mealSlot);
    setNutrition({
      protein: log.proteinRating,
      fat: log.fatRating,
      fibre: log.fibreRating
    });
    setOverall(log.overallHealthRating);
    setDate(log.date);
    setShowLogForm(true);
  };

  const resetForm = () => {
    setShowLogForm(false);
    setEditingLog(null);
    setMealName('');
    setSlot('breakfast');
    setNutrition({ protein: 3, fat: 3, fibre: 3 });
    setOverall(3);
    setDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const getSlotIcon = (slot: MealSlot) => {
    switch(slot) {
      case 'breakfast': return <Apple size={18} />;
      case 'snack': return <Info size={18} />;
      default: return <ChefHat size={18} />;
    }
  };

  return (
    <Layout>
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-[28px] font-black leading-tight text-teal">Eat Loop</h1>
          <p className="text-slate font-medium">Quality over quantity.</p>
        </div>
        <Button 
          variant="primary" 
          domain="eat" 
          fullWidth={false} 
          className="h-12 w-12 rounded-full p-0"
          onClick={() => setShowLogForm(true)}
        >
          <Plus size={24} />
        </Button>
      </header>

      {/* Daily Summary */}
      <Card className="mb-8 bg-teal/5 flex items-center justify-around py-6 text-center">
        <div>
          <span className="block text-2xl font-black text-navy">{logs.filter(l => l.date === format(new Date(), 'yyyy-MM-dd')).length}</span>
          <span className="text-[11px] font-bold text-slate uppercase tracking-wider">Meals Logged</span>
        </div>
        <div className="w-px h-10 bg-teal/20" />
        <div>
          <span className="block text-2xl font-black text-navy">
             {logs.length > 0 ? (logs.reduce((acc, l) => acc + l.overallHealthRating, 0) / logs.length).toFixed(1) : '-'}
          </span>
          <span className="text-[11px] font-bold text-slate uppercase tracking-wider">Avg Health</span>
        </div>
      </Card>

      <div className="flex flex-col gap-6 pb-20">
        <h3 className="font-bold text-navy uppercase tracking-widest text-[12px] mb-1">Recent Meals</h3>
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-[80px] bg-off-white rounded-card animate-pulse" />)
        ) : logs.length === 0 ? (
          <div className="text-center py-10 opacity-50">
            <Utensils size={48} className="mx-auto mb-4" />
            <p className="font-medium">No meals recorded yet.</p>
          </div>
        ) : (
          logs.map((log) => (
            <Card key={log.id} className="flex flex-col gap-3 group relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-lg bg-teal/10 flex items-center justify-center text-teal">
                      {getSlotIcon(log.mealSlot)}
                   </div>
                   <div>
                     <h4 className="font-bold text-navy leading-tight">{log.mealName}</h4>
                     <span className="text-xs font-bold text-slate uppercase tracking-wider">{log.mealSlot} · {format(new Date(log.date), 'MMM d')}</span>
                   </div>
                </div>
                <div className="flex items-center gap-2">
                   <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(log)} className="p-2 text-slate hover:text-navy"><Edit3 size={18} /></button>
                      <button onClick={() => handleDelete(log.id!)} className="p-2 text-slate hover:text-red-500"><Trash2 size={18} /></button>
                   </div>
                   <div className="w-9 h-9 rounded-full bg-teal flex items-center justify-center text-white font-black text-[15px] shadow-sm">
                     {log.overallHealthRating}
                   </div>
                </div>
              </div>
              <div className="flex gap-2">
                {['protein', 'fat', 'fibre'].map(type => (
                  <div key={type} className="bg-off-white rounded-full px-3 py-1 text-[10px] font-bold text-slate uppercase tracking-tighter">
                    {type}: {log[`${type}Rating` as keyof MealLog]}
                  </div>
                ))}
              </div>
            </Card>
          ))
        )}
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
              className="bg-white w-full rounded-t-[32px] sm:rounded-[24px] p-8 pb-10 max-w-[420px] max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-teal">{editingLog ? 'Edit Meal' : 'Record Meal'}</h2>
                <button onClick={resetForm} className="text-slate p-1"><X /></button>
              </div>

              <form onSubmit={handleSave} className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-black tracking-widest text-slate uppercase">Date</label>
                  <input 
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-14 bg-off-white border-2 border-transparent focus:border-teal focus:bg-white rounded-2xl px-5 font-bold transition-all outline-none"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-black tracking-widest text-slate uppercase">What did you eat?</label>
                  <input 
                    type="text"
                    placeholder="e.g. Avocado Toast with Egg"
                    value={mealName}
                    onChange={(e) => setMealName(e.target.value)}
                    className="h-14 bg-off-white border-2 border-transparent focus:border-teal focus:bg-white rounded-2xl px-5 font-bold transition-all outline-none"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-black tracking-widest text-slate uppercase">Meal Slot</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['breakfast', 'lunch', 'dinner', 'snack'].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSlot(s as MealSlot)}
                        className={cn(
                          "h-12 rounded-xl border-2 text-[13px] font-bold capitalize transition-all",
                          slot === s ? "bg-teal border-teal text-white shadow-sm" : "border-off-white bg-off-white text-slate"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Micro-ratings */}
                <div className="space-y-4 py-4 border-y border-off-white/10">
                  {['protein', 'fat', 'fibre'].map((type) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-[13px] font-black uppercase tracking-wider text-navy">{type} Rating</span>
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5].map(v => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setNutrition({ ...nutrition, [type]: v })}
                            className={cn(
                              "w-8 h-8 rounded-lg font-black text-xs transition-all",
                              nutrition[type as keyof typeof nutrition] === v ? "bg-teal text-white" : "bg-off-white text-slate"
                            )}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-2">
                   <label className="text-[11px] font-black tracking-widest text-slate uppercase">Overall Healthiness</label>
                   <div className="flex gap-2">
                     {[1, 2, 3, 4, 5].map(v => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setOverall(v)}
                          className={cn(
                            "flex-1 h-[56px] rounded-2xl border-2 flex flex-col items-center justify-center transition-all",
                            overall === v ? "bg-teal border-teal text-white shadow-md scale-105" : "border-off-white bg-off-white text-slate"
                          )}
                        >
                          <span className="text-xl font-black">{v}</span>
                        </button>
                     ))}
                   </div>
                </div>

                <div className="mt-4">
                  <Button type="submit" domain="eat">
                    {editingLog ? 'Update Meal' : 'Save Meal'}
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
