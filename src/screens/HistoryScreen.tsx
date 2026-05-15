/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/UI';
import { useFirebase } from '../contexts/FirebaseContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { OperationType, handleFirestoreError } from '../lib/firebase';
import { format } from 'date-fns';
import { Calendar, Download } from 'lucide-react';
import { LoopScore } from '../types';

export function HistoryScreen() {
  const { user } = useFirebase();
  const [scores, setScores] = useState<LoopScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchScores = async () => {
      if (!user) return;
      setLoading(true);
      const path = 'loopScores';
      try {
        const q = query(
          collection(db, path),
          where('userId', '==', user.uid),
          orderBy('date', 'desc'),
          limit(30)
        );
        const snap = await getDocs(q);
        setScores(snap.docs.map(doc => doc.data() as LoopScore));
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, path);
      } finally {
        setLoading(false);
      }
    };
    fetchScores();
  }, [user]);

  return (
    <Layout>
      <header className="mb-8 flex justify-between items-end">
        <div>
           <h1 className="text-[28px] font-black leading-tight">Your History</h1>
           <p className="text-slate font-medium">Looking back to move forward.</p>
        </div>
        <button className="w-10 h-10 rounded-full bg-off-white flex items-center justify-center text-slate">
           <Download size={20} />
        </button>
      </header>

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
