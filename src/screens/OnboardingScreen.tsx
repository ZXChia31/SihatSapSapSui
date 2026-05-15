/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../components/UI';
import { ChevronLeft, Clock, Clock3 } from 'lucide-react';
import { cn } from '../lib/utils';

import { User } from '../types';

interface OnboardingProps {
  onComplete: (data: Partial<User>) => void;
}

export function OnboardingScreen({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [bedtime, setBedtime] = useState('22:30');
  const [wakeTime, setWakeTime] = useState('06:30');
  const [activityTarget, setActivityTarget] = useState(3);
  const [mealTarget, setMealTarget] = useState(3);

  const calculateHours = (start: string, end: string) => {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    let diff = (endH * 60 + endM) - (startH * 60 + startM);
    if (diff < 0) diff += 24 * 60;
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return `${h}h ${m ? m + 'm' : ''}`;
  };

  const activityOptions = [
    { count: 2, label: "Light start" },
    { count: 3, label: "Building habit" },
    { count: 4, label: "Active lifestyle" },
    { count: 5, label: "High commitment" }
  ];

  const mealOptions = [
    { count: 1, label: "Single focus" },
    { count: 2, label: "Balanced daily" },
    { count: 3, label: "Optimal routine" },
    { count: 4, label: "Max discipline" }
  ];

  const nextStep = () => {
    if (step < 4) setStep(step + 1);
    else {
      onComplete({
        displayName: name,
        sleepTargetBedtime: bedtime,
        sleepTargetWakeTime: wakeTime,
        sleepTargetHours: (parseInt(calculateHours(bedtime, wakeTime).split('h')[0])), // Simplified
        weeklyActivityTarget: activityTarget,
        dailyHealthyMealTarget: mealTarget,
        onboardingComplete: true
      });
    }
  };

  const prevStep = () => setStep(step - 1);

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* Progress Bar */}
      <div className="px-5 pt-8 mb-12">
        <div className="flex gap-2 h-[6px]">
          {[1, 2, 3, 4].map((s) => (
            <div 
              key={s} 
              className={cn(
                "flex-1 rounded-full transition-all duration-500",
                s < step ? "bg-yellow opacity-100" : 
                s === step ? "bg-yellow opacity-60 animate-pulse" : "bg-off-white"
              )}
            />
          ))}
        </div>
      </div>

      {step > 1 && (
        <button 
          onClick={prevStep}
          className="absolute top-8 left-5 flex items-center text-slate font-medium text-sm mt-8"
        >
          <ChevronLeft size={18} />
          Back
        </button>
      )}

      <main className="flex-1 px-5 flex flex-col gap-6">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-2"
            >
              <h2 className="text-[26px] font-black text-navy">What should we call you?</h2>
              <p className="text-[#64748B] text-[15px] mb-4">This is just for your weekly insights.</p>
              <input 
                type="text"
                placeholder="e.g. Alex"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-[60px] rounded-radius-input border-2 border-off-white px-5 text-lg font-medium focus:border-navy focus:outline-none focus:ring-4 focus:ring-navy/5 transition-all"
              />
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
               key="step2"
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -20 }}
               className="flex flex-col gap-2"
            >
              <h2 className="text-[26px] font-black text-amber">When do you usually sleep?</h2>
              <p className="text-[#64748B] text-[15px] mb-4">We'll use this to track your sleep consistency.</p>
              
              <div className="flex gap-3 mb-4 items-center">
                <div className="flex-1 h-[80px] bg-[#FFF8EE] border-l-2 border-amber rounded-radius-card p-4 flex flex-col relative">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock size={16} className="text-amber" />
                    <span className="text-[12px] font-bold text-slate">Bedtime</span>
                  </div>
                  <input 
                    type="time" 
                    value={bedtime}
                    onChange={(e) => setBedtime(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <span className="text-[26px] font-black text-navy leading-none">{bedtime}</span>
                </div>

                <div className="h-[32px] px-3 bg-amber/10 border border-amber/20 rounded-full flex items-center justify-center text-amber font-bold text-[15px] shrink-0">
                  {calculateHours(bedtime, wakeTime)}
                </div>

                <div className="flex-1 h-[80px] bg-[#FFF8EE] border-l-2 border-amber rounded-radius-card p-4 flex flex-col relative">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock3 size={16} className="text-amber" />
                    <span className="text-[12px] font-bold text-slate">Wake time</span>
                  </div>
                  <input 
                    type="time" 
                    value={wakeTime}
                    onChange={(e) => setWakeTime(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <span className="text-[26px] font-black text-navy leading-none">{wakeTime}</span>
                </div>
              </div>

              <div className="bg-yellow/10 rounded-full py-2 px-4 inline-self-start text-[13px] font-medium text-slate text-center">
                Most adults need 7–9 hours
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
               key="step3"
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -20 }}
               className="flex flex-col gap-2"
            >
              <h2 className="text-[26px] font-black text-violet">How many times a week do you want to move?</h2>
              <p className="text-[#64748B] text-[15px] mb-4">You can change this anytime in settings.</p>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {activityOptions.map((opt) => (
                  <button
                    key={opt.count}
                    onClick={() => setActivityTarget(opt.count)}
                    className={cn(
                      "h-[80px] rounded-radius-card border-[1.5px] p-4 flex flex-col items-center justify-center transition-all",
                      activityTarget === opt.count ? "bg-violet border-violet text-white shadow-lg" : "bg-white border-off-white text-navy"
                    )}
                  >
                    <span className="text-[32px] font-black leading-none">{opt.count}</span>
                    <span className={cn("text-[13px] font-medium", activityTarget === opt.count ? "text-white/80" : "text-slate")}>
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate uppercase tracking-wider">Or set your own:</label>
                <input 
                  type="number"
                  inputMode="numeric"
                  value={activityTarget}
                  onChange={(e) => setActivityTarget(parseInt(e.target.value) || 1)}
                  className="h-[60px] rounded-radius-input border-2 border-off-white px-5 text-lg font-medium focus:border-violet focus:outline-none focus:ring-4 focus:ring-violet/5 transition-all"
                  min="1"
                  max="100"
                />
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div 
               key="step4"
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -20 }}
               className="flex flex-col gap-2"
            >
              <h2 className="text-[26px] font-black text-teal">What's your daily healthy meal target?</h2>
              <p className="text-[#64748B] text-[15px] mb-4">Focusing on quality over quantity.</p>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {mealOptions.map((opt) => (
                  <button
                    key={opt.count}
                    onClick={() => setMealTarget(opt.count)}
                    className={cn(
                      "h-[80px] rounded-radius-card border-[1.5px] p-4 flex flex-col items-center justify-center transition-all",
                      mealTarget === opt.count ? "bg-teal border-teal text-white shadow-lg" : "bg-white border-off-white text-navy"
                    )}
                  >
                    <span className="text-[32px] font-black leading-none">{opt.count}</span>
                    <span className={cn("text-[13px] font-medium", mealTarget === opt.count ? "text-white/80" : "text-slate")}>
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate uppercase tracking-wider">Target healthy meals per day:</label>
                <input 
                  type="number"
                  inputMode="numeric"
                  value={mealTarget}
                  onChange={(e) => setMealTarget(parseInt(e.target.value) || 1)}
                  className="h-[60px] rounded-radius-input border-2 border-off-white px-5 text-lg font-medium focus:border-teal focus:outline-none focus:ring-4 focus:ring-teal/5 transition-all"
                  min="1"
                  max="6"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-auto pb-10">
          <Button 
            onClick={nextStep} 
            disabled={step === 1 && !name.trim()}
            domain={step === 2 ? 'sleep' : step === 3 ? 'move' : step === 4 ? 'eat' : 'none'}
          >
            {step < 4 ? 'Continue →' : "Let's go →"}
          </Button>
        </div>
      </main>
    </div>
  );
}
