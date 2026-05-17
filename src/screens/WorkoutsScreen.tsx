/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Layout } from '../components/Layout';
import { Card } from '../components/UI';
import { GUIDED_WORKOUTS } from '../constants';
import { Play, Clock, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

export function WorkoutsScreen() {
  const navigate = useNavigate();

  const handleSelectWorkout = (title: string) => {
    // Navigate back to move screen with the selected workout title
    navigate('/move', { state: { startWorkout: title } });
  };

  return (
    <Layout>
      <header className="mb-8">
        <button 
          onClick={() => navigate('/move')}
          className="flex items-center gap-2 text-slate font-bold mb-4 hover:text-navy transition-colors"
        >
          <ArrowLeft size={18} />
          Back to Move
        </button>
        <h1 className="text-[32px] font-black leading-tight text-navy">Guided Workouts</h1>
        <p className="text-slate font-medium">Select a routine to start your step-by-step session.</p>
      </header>

      <div className="grid grid-cols-1 gap-4 pb-24">
        {GUIDED_WORKOUTS.map((workout) => (
          <Card key={workout.title} className="p-0 overflow-hidden border-none group shadow-md hover:shadow-xl transition-all active:scale-[0.98]">
            <button 
              onClick={() => handleSelectWorkout(workout.title)}
              className="w-full text-left p-6 bg-white transition-colors flex items-center justify-between"
            >
              <div className="flex-1">
                 <span className={cn(
                    "inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-2",
                    workout.energyCost === 'low' ? "bg-teal text-white" : "bg-amber text-white"
                 )}>
                   {workout.energyCost} Energy Cost
                 </span>
                 <h4 className="font-black text-2xl text-navy leading-none mb-2">{workout.title}</h4>
                 <div className="flex items-center gap-3 text-slate text-sm font-bold">
                    <div className="flex items-center gap-1">
                        <Clock size={16} />
                        {workout.durationMinutes}m
                    </div>
                    <span>·</span>
                    <div>{workout.exercises.length} exercises</div>
                 </div>
              </div>
              <div className="w-14 h-14 rounded-full bg-violet/10 text-violet flex items-center justify-center group-hover:bg-violet group-hover:text-white transition-all shadow-inner">
                <Play size={24} className="ml-1 fill-current" />
              </div>
            </button>
          </Card>
        ))}
      </div>
    </Layout>
  );
}
