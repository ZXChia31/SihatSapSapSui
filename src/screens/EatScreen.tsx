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
import { Utensils, Plus, Info, Apple, ChefHat, Trash2, Edit3, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MealLog, MealSlot } from '../types';
import { calculateEatScore, calculateOverallScore } from '../lib/scoring';
import { cn } from '../lib/utils';
import { AIPatterns } from '../components/AIPatterns';

export function EatScreen() {
  const { user, profile } = useFirebase();
  const [logs, setLogs] = useState<MealLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogForm, setShowLogForm] = useState(false);
  const [editingLog, setEditingLog] = useState<MealLog | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form State
  const [mealName, setMealName] = useState('');
  const [slot, setSlot] = useState<MealSlot>('breakfast');
  const [nutrition, setNutrition] = useState<{ 
    protein: string | null; 
    fat: string | null; 
    fiber: string | null; 
  }>({ protein: '0', fat: '0', fiber: '0' });
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

  const updateLoopScore = async (currentDate: string, updatedLogs: MealLog[]) => {
    if (!user || !profile) return;
    try {
      const scoreId = `${user.uid}_${currentDate}`;
      const scoreRef = doc(db, 'loopScores', scoreId);
      const scoreSnap = await getDoc(scoreRef);
      
      const daysMeals = updatedLogs.filter(l => l.date === currentDate);
      const newEatScore = calculateEatScore(daysMeals, profile);
      
      if (scoreSnap.exists()) {
        const scoreData = scoreSnap.data();
        const newOverall = calculateOverallScore({
          sleepScore: scoreData.sleepScore || 0,
          eatScore: newEatScore,
          moveScore: scoreData.moveScore || 0
        });
        await updateDoc(scoreRef, {
          eatScore: Math.round(newEatScore),
          overallScore: Math.round(newOverall),
          computedAt: new Date().toISOString()
        });
      } else {
        const newOverall = calculateOverallScore({
          sleepScore: 0,
          eatScore: newEatScore,
          moveScore: 0
        });
        await setDoc(scoreRef, {
          userId: user.uid,
          date: currentDate,
          sleepScore: 0,
          eatScore: Math.round(newEatScore),
          moveScore: 0,
          overallScore: Math.round(newOverall),
          computedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.warn('Failed to update loop score after meal change:', err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !mealName.trim()) return;

    const logData: Omit<MealLog, 'id'> = {
      userId: user.uid,
      date,
      mealName,
      mealSlot: slot,
      overallHealthRating: overall,
      loggedAt: new Date().toISOString()
    };

    if (nutrition.protein !== null) logData.proteinGrams = parseInt(nutrition.protein || '0');
    if (nutrition.fat !== null) logData.fatGrams = parseInt(nutrition.fat || '0');
    if (nutrition.fiber !== null) logData.fiberGrams = parseInt(nutrition.fiber || '0');

    const path = 'mealLogs';
    try {
      let docId = editingLog?.id;
      if (docId) {
        await updateDoc(doc(db, path, docId), logData);
      } else {
        const res = await addDoc(collection(db, path), logData);
        docId = res.id;
      }
      
      const newLog = { id: docId, ...logData } as MealLog;
      const updatedLogs = editingLog?.id 
        ? logs.map(l => l.id === editingLog.id ? newLog : l)
        : [newLog, ...logs];
      
      await updateLoopScore(date, updatedLogs);
      
      resetForm();
      fetchLogs();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const handleDelete = async (id: string) => {
    const logToDelete = logs.find(l => l.id === id);
    if (!logToDelete) return;

    const path = 'mealLogs';
    try {
      await deleteDoc(doc(db, path, id));
      const updatedLogs = logs.filter(log => log.id !== id);
      setLogs(updatedLogs);

      await updateLoopScore(logToDelete.date, updatedLogs);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const handleEdit = (log: MealLog) => {
    setEditingLog(log);
    setMealName(log.mealName);
    setSlot(log.mealSlot);
    setNutrition({
      protein: log.proteinGrams !== undefined ? log.proteinGrams.toString() : null,
      fat: log.fatGrams !== undefined ? log.fatGrams.toString() : null,
      fiber: log.fiberGrams !== undefined ? log.fiberGrams.toString() : null
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
    setNutrition({ protein: '0', fat: '0', fiber: '0' });
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
      <Card className="mb-10 bg-white border-none shadow-lifted p-0 overflow-hidden rounded-[32px] relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-teal/5 to-transparent opacity-50" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-teal/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />
        
        <div className="flex items-center justify-around py-8 px-4 text-center relative z-10">
          <div className="flex-1">
            <span className="block text-[32px] font-black text-navy leading-none mb-1">
              {logs.filter(l => l.date === format(new Date(), 'yyyy-MM-dd')).length}
            </span>
            <span className="text-[10px] font-black text-slate/50 uppercase tracking-[0.2em]">Meals Today</span>
          </div>
          <div className="w-px h-12 bg-off-white" />
          <div className="flex-1">
            <span className="block text-[32px] font-black text-navy leading-none mb-1">
               {logs.length > 0 ? (logs.reduce((acc, l) => acc + l.overallHealthRating, 0) / logs.length).toFixed(1) : '-'}
            </span>
            <span className="text-[10px] font-black text-slate/50 uppercase tracking-[0.2em]">Avg Quality</span>
          </div>
        </div>
      </Card>

      <div className="mb-8">
        <AIPatterns userId={user?.uid || ''} domain="Eat" logs={logs} profile={profile} />
      </div>

      <div className="flex flex-col gap-6 pb-20">
        <h3 className="font-bold text-navy uppercase tracking-widest text-[12px] mb-1">Recent Meals</h3>
        <motion.div 
          className="flex flex-col gap-6"
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.05 } }
          }}
        >
          {loading ? (
            [1, 2, 3].map(i => <div key={i} className="h-[80px] bg-off-white rounded-card animate-pulse" />)
          ) : logs.length === 0 ? (
            <div className="text-center py-10 opacity-50">
              <Utensils size={48} className="mx-auto mb-4" />
              <p className="font-medium">No meals recorded yet.</p>
            </div>
          ) : (
            logs.map((log) => (
              <motion.div
                key={log.id}
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0 }
                }}
              >
                <Card className="flex flex-col gap-4 p-5 border-none shadow-sm hover:shadow-md transition-all active:scale-[0.99] group overflow-hidden relative">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-teal/20 group-hover:bg-teal transition-colors" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-2xl bg-off-white flex items-center justify-center text-teal group-hover:bg-teal/10 transition-colors shadow-inner">
                          {getSlotIcon(log.mealSlot)}
                       </div>
                       <div>
                         <h4 className="font-black text-navy text-lg leading-tight tracking-tight mb-0.5">{log.mealName}</h4>
                         <div className="flex items-center gap-2">
                           <span className="text-[10px] font-black text-teal uppercase tracking-widest bg-teal/5 px-2 py-0.5 rounded-full">{log.mealSlot}</span>
                           <span className="text-[10px] font-bold text-slate/50 uppercase tracking-widest">{format(new Date(log.date), 'MMM d')}</span>
                         </div>
                       </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                       <div className="text-right">
                         <span className="block text-2xl font-black text-navy leading-none">{log.overallHealthRating}</span>
                         <span className="text-[9px] font-black text-slate/40 uppercase tracking-widest">Quality</span>
                       </div>
                       <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleEdit(log); }} 
                            className="p-1.5 text-slate hover:text-navy transition-colors"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(log.id!); }} 
                            className="p-1.5 text-slate hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                       </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-off-white/50">
                    {[
                      { label: 'Prot', value: log.proteinGrams, color: 'teal', icon: 'P' },
                      { label: 'Fat', value: log.fatGrams, color: 'amber', icon: 'F' },
                      { label: 'Fib', value: log.fiberGrams, color: 'violet', icon: 'F' }
                    ].map(n => (
                      <div key={n.label} className="flex items-center gap-1.5 bg-off-white/50 rounded-full pl-1 pr-3 py-1 text-[10px] font-bold text-slate uppercase group/tag transition-colors hover:bg-white border border-transparent hover:border-slate/10">
                        <div className={cn(
                          "w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white",
                          n.color === 'teal' ? "bg-teal" : n.color === 'amber' ? "bg-amber" : "bg-violet"
                        )}>
                          {n.icon}
                        </div>
                        <span>{n.value !== undefined ? `${n.value}g` : '?'}</span>
                        <span className="opacity-40">{n.label}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            ))
          )}
        </motion.div>
      </div>

      <ConfirmModal 
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        title="Delete Meal"
        message="Are you sure you want to remove this meal? This will affect your health scores for the day."
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

                {/* Gram Inputs */}
                <div className="space-y-4 py-4 border-y border-off-white/10">
                  <p className="text-[11px] font-black tracking-widest text-slate uppercase">Nutritional Components (Grams)</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Protein', key: 'protein', color: 'teal', icon: 'P' },
                      { label: 'Fat', key: 'fat', color: 'amber', icon: 'F' },
                      { label: 'Fiber', key: 'fiber', color: 'violet', icon: 'Fib' }
                    ].map((n) => {
                      const isUnsure = nutrition[n.key as keyof typeof nutrition] === null;
                      return (
                        <div key={n.key} className="space-y-1.5 text-center flex flex-col items-center">
                          <div className={cn(
                            "w-8 h-8 rounded-lg mx-auto flex items-center justify-center font-black text-[10px] mb-1 transition-all",
                            isUnsure ? "bg-slate/10 text-slate/40" : (n.color === 'teal' ? "bg-teal/10 text-teal" : n.color === 'amber' ? "bg-amber/10 text-amber" : "bg-violet/10 text-violet")
                          )}>
                            {n.icon}
                          </div>
                          
                          <div className="relative w-full">
                            <input 
                              type="number" 
                              inputMode="numeric"
                              placeholder="0"
                              disabled={isUnsure}
                              value={isUnsure ? '' : (nutrition[n.key as keyof typeof nutrition] || '')}
                              onChange={(e) => setNutrition({...nutrition, [n.key]: e.target.value})}
                              className={cn(
                                "w-full h-10 border-2 border-transparent rounded-xl px-2 text-center font-black text-sm outline-none transition-all shadow-inner",
                                isUnsure ? "bg-off-white/50 text-slate/20 italic" : "bg-off-white focus:border-navy focus:bg-white text-navy"
                              )}
                            />
                            {isUnsure && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span className="text-[10px] font-black text-slate/40 uppercase tracking-tighter">?</span>
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setNutrition({
                                ...nutrition,
                                [n.key]: isUnsure ? '0' : null
                              });
                            }}
                            className={cn(
                              "text-[9px] font-black uppercase tracking-tight px-2 py-1 rounded-full transition-all mt-1",
                              isUnsure ? "bg-navy text-white" : "text-slate/40 hover:text-navy"
                            )}
                          >
                            {isUnsure ? "Known" : "Unsure?"}
                          </button>
                          
                          <span className="text-[10px] font-bold text-slate/60 uppercase">{n.label}</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] font-medium text-slate/40 text-center italic">Tip: If you're unsure, the loop will use average benchmarks.</p>
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

                <div className="mt-6 flex flex-col gap-3">
                  <Button type="submit" domain="eat">
                    {editingLog ? 'Update Meal' : 'Save Meal'}
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
