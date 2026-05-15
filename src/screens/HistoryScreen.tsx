/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/UI';
import { useFirebase } from '../contexts/FirebaseContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { OperationType, handleFirestoreError } from '../lib/firebase';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { Calendar, Download, Filter, X } from 'lucide-react';
import { LoopScore } from '../types';

export function HistoryScreen() {
  const { user } = useFirebase();
  const [scores, setScores] = useState<LoopScore[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Date range state - Default to last 30 days
  const [startDate, setStartDate] = useState<string>(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const fetchScores = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const path = 'loopScores';
    try {
      let q = query(
        collection(db, path),
        where('userId', '==', user.uid),
        orderBy('date', 'desc'),
        limit(50)
      );

      // If dates are provided, we filter. Note: This might require a composite index 
      // in a real production app, but for this dev environment we'll handle partial filtering
      const snap = await getDocs(q);
      let results = snap.docs.map(doc => doc.data() as LoopScore);
      
      // Client-side filtering for precise ranges to avoid index requirement overhead during dev
      if (startDate && endDate) {
        const start = startOfDay(new Date(startDate)).getTime();
        const end = endOfDay(new Date(endDate)).getTime();
        results = results.filter(s => {
          const d = new Date(s.date).getTime();
          return d >= start && d <= end;
        });
      }
      
      setScores(results);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    } finally {
      setLoading(false);
    }
  }, [user, startDate, endDate]);

  useEffect(() => {
    fetchScores();
  }, [fetchScores]);

  return (
    <Layout>
      <header className="mb-6 flex justify-between items-end">
        <div>
           <h1 className="text-[28px] font-black leading-tight">Your History</h1>
           <p className="text-slate font-medium">Looking back to move forward.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isFilterOpen ? 'bg-navy text-white' : 'bg-off-white text-slate'}`}
          >
             <Filter size={18} />
          </button>
          <button className="w-10 h-10 rounded-full bg-off-white flex items-center justify-center text-slate">
             <Download size={18} />
          </button>
        </div>
      </header>

      {/* Date Range Picker UI */}
      {isFilterOpen && (
        <div className="mb-6 bg-off-white/50 p-5 rounded-card border border-off-white animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-black uppercase tracking-widest text-slate">Filter by Date Range</span>
            <button onClick={() => setIsFilterOpen(false)} className="text-slate/40 hover:text-navy">
              <X size={16} />
            </button>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[9px] font-black text-slate/40 uppercase block mb-1">From</label>
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-white rounded-xl px-3 py-2 text-sm font-bold border-2 border-transparent focus:border-navy transition-all outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="text-[9px] font-black text-slate/40 uppercase block mb-1">To</label>
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-white rounded-xl px-3 py-2 text-sm font-bold border-2 border-transparent focus:border-navy transition-all outline-none"
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 pb-20">
        {loading ? (
           [1, 2, 3].map(i => <div key={i} className="h-24 bg-off-white rounded-card animate-pulse" />)
        ) : scores.length === 0 ? (
          <div className="text-center py-20 bg-off-white/50 rounded-card border-2 border-dashed border-off-white">
            <Calendar size={48} className="mx-auto text-slate/20 mb-4" />
            <p className="font-bold text-slate">Your health history will appear here.</p>
            <p className="text-xs text-light-slate mt-1">Keep logging daily to build your record.</p>
          </div>
        ) : (
          scores.map((score, i) => (
            <Card key={i} className="flex items-center justify-between py-4">
               <div>
                  <h4 className="font-bold text-navy">{format(new Date(score.date), 'EEEE, MMM d')}</h4>
                  <div className="flex gap-3 mt-1">
                     <span className="text-[11px] font-bold text-amber uppercase">Sleep: {score.sleepScore}%</span>
                     <span className="text-[11px] font-bold text-teal uppercase">Eat: {score.eatScore}%</span>
                     <span className="text-[11px] font-bold text-violet uppercase">Move: {score.moveScore}%</span>
                  </div>
               </div>
               <div className="flex flex-col items-center justify-center bg-yellow/10 w-14 h-14 rounded-xl border border-yellow/20">
                  <span className="text-xl font-black text-navy">{score.overallScore}</span>
                  <span className="text-[9px] font-black uppercase text-yellow-600">Loop</span>
               </div>
            </Card>
          ))
        )}

        {/* Mocking some sample history for design check if empty */}
        {scores.length === 0 && (
           <div className="opacity-30 pointer-events-none grayscale">
              <Card className="flex items-center justify-between mb-3">
                <div className="flex flex-col">
                   <h4 className="font-bold">Yesterday</h4>
                   <span className="text-xs font-bold text-slate">Example Data</span>
                </div>
                <div className="w-12 h-12 rounded-lg bg-off-white flex items-center justify-center text-xl font-black">72</div>
              </Card>
              <Card className="flex items-center justify-between">
                <div className="flex flex-col">
                   <h4 className="font-bold">2 days ago</h4>
                   <span className="text-xs font-bold text-slate">Example Data</span>
                </div>
                <div className="w-12 h-12 rounded-lg bg-off-white flex items-center justify-center text-xl font-black">65</div>
              </Card>
           </div>
        )}
      </div>
    </Layout>
  );
}
