/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirebase } from '../contexts/FirebaseContext';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Button, Card } from '../components/UI';
import { ChevronRight, ChevronLeft, Check, Info } from 'lucide-react';
import { cn } from '../lib/utils';
import { OperationType, handleFirestoreError } from '../lib/firebase';

import { HABIT_OPTIONS } from '../constants';

export function OnboardingScreen() {
  const { user } = useFirebase();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const [formData, setFormData] = useState({
    age: '',
    gender: 'prefer_not_to_say',
    weight: '', // kg
    height: '', // cm
    habits: {
      sleep: [] as string[],
      eat: [] as string[],
      move: [] as string[],
    },
    sleepTarget: '8',
    sleepBedtime: '23:00',
    sleepWakeTime: '07:00',
    eatTarget: '3',
    nutritionTargets: {
      protein: 150,
      fat: 70,
      fiber: 30
    },
    moveTarget: '3',
    moveDurationTarget: '150',
    aiFocusPreferences: [] as string[],
  });

  const bmi = useMemo(() => {
    if (formData.weight && formData.height) {
      const w = parseFloat(formData.weight);
      const h = parseFloat(formData.height) / 100;
      if (w > 0 && h > 0) {
        return parseFloat((w / (h * h)).toFixed(2));
      }
    }
    return 0;
  }, [formData.weight, formData.height]);

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
    else handleSubmit();
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!user) return;
    const path = `users`;
    try {
      await setDoc(doc(db, path, user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'Loop User',
        photoUrl: user.photoURL || '',
        age: parseInt(formData.age),
        gender: formData.gender,
        weight: parseFloat(formData.weight),
        height: parseFloat(formData.height),
        bmi: bmi,
        habits: {
          sleep: formData.habits.sleep.join('. '),
          eat: formData.habits.eat.join('. '),
          move: formData.habits.move.join('. ')
        },
        sleepTargetHours: parseFloat(formData.sleepTarget),
        sleepTargetBedtime: formData.sleepBedtime,
        sleepTargetWakeTime: formData.sleepWakeTime,
        dailyHealthyMealTarget: parseInt(formData.eatTarget),
        nutritionTargets: formData.nutritionTargets,
        aiFocusPreferences: formData.aiFocusPreferences,
        weeklyActivityTarget: parseInt(formData.moveTarget),
        weeklyActivityDurationTarget: parseInt(formData.moveDurationTarget),
        onboardingComplete: true,
        createdAt: new Date().toISOString(),
        aiUsage: {
          dailyRequests: 0,
          totalRequests: 0,
          lastResetDate: new Date().toISOString().split('T')[0],
          balance: 100
        },
        settings: {
          pushNotifications: true,
          activityReminders: true,
          sleepAlerts: true,
          aiInsights: true,
          emailInsights: false
        }
      }, { merge: true });
      navigate('/');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${path}/${user.uid}`);
    }
  };

  const isStepValid = () => {
    switch (step) {
      case 1: return formData.age !== '';
      case 2: return formData.weight !== '' && formData.height !== '';
      case 3: return formData.habits.sleep.length > 0 && formData.habits.eat.length > 0 && formData.habits.move.length > 0;
      default: return true;
    }
  };

  const toggleHabit = (type: keyof typeof formData.habits, habit: string) => {
    const current = formData.habits[type];
    if (current.includes(habit)) {
      setFormData({
        ...formData,
        habits: { ...formData.habits, [type]: current.filter(h => h !== habit) }
      });
    } else {
      setFormData({
        ...formData,
        habits: { ...formData.habits, [type]: [...current, habit] }
      });
    }
  };

  return (
    <div className="min-h-screen bg-off-white flex flex-col p-6 font-sans">
      <header className="max-w-[420px] mx-auto w-full mb-12 pt-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-black text-navy leading-none">Your Loop <span className="text-teal">Starts Here</span></h1>
          <div className="text-slate font-black text-sm">Step {step}/{totalSteps}</div>
        </div>
        <div className="w-full h-2 bg-white rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${(step / totalSteps) * 100}%` }}
            className="h-full bg-teal transition-all duration-300"
          />
        </div>
      </header>

      <main className="flex-1 max-w-[420px] mx-auto w-full flex flex-col">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-2xl font-black text-navy mb-2">The Basics</h2>
                <p className="text-slate font-medium">Let's get to know you better. How old are you and what is your gender?</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate px-1">Age</label>
                  <input 
                    type="number" 
                    inputMode="numeric"
                    placeholder="Enter age"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className="w-full h-16 bg-white border-2 border-transparent focus:border-navy rounded-2xl px-6 font-bold text-lg transition-all outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate px-1">Gender</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['male', 'female', 'other', 'prefer_not_to_say'].map((g) => (
                      <button
                        key={g}
                        onClick={() => setFormData({ ...formData, gender: g })}
                        className={cn(
                          "h-14 rounded-2xl font-bold capitalize transition-all border-2",
                          formData.gender === g ? "bg-navy text-white border-navy" : "bg-white text-slate border-transparent hover:border-off-white"
                        )}
                      >
                        {g.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-2xl font-black text-navy mb-2">Physical Stats</h2>
                <p className="text-slate font-medium">Your height and weight help us personalize your hydration and activity goals.</p>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate px-1">Height (cm)</label>
                    <input 
                      type="number" 
                      inputMode="numeric"
                      placeholder="cm"
                      value={formData.height}
                      onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                      className="w-full h-16 bg-white border-2 border-transparent focus:border-navy rounded-2xl px-6 font-bold text-lg transition-all outline-none text-center"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate px-1">Weight (kg)</label>
                    <input 
                      type="number" 
                      inputMode="numeric"
                      placeholder="kg"
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                      className="w-full h-16 bg-white border-2 border-transparent focus:border-navy rounded-2xl px-6 font-bold text-lg transition-all outline-none text-center"
                    />
                  </div>
                </div>

                {bmi > 0 && (
                  <Card className="bg-teal/5 border-teal/20 p-6 flex items-center gap-5">
                    <div className="w-16 h-16 rounded-full bg-white border-4 border-teal flex items-center justify-center font-black text-navy text-xl shadow-sm">
                      {bmi}
                    </div>
                    <div>
                      <span className="text-[11px] font-black text-teal uppercase tracking-widest block mb-1">Your Calculated BMI</span>
                      <p className="text-navy font-bold leading-tight">
                        {bmi < 18.5 ? "Underweight" : bmi < 25 ? "Healthy weight" : bmi < 30 ? "Overweight" : "Obese"}
                      </p>
                    </div>
                  </Card>
                )}
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8 pb-10"
            >
              <div>
                <h2 className="text-2xl font-black text-navy mb-2">Identify Your Habits</h2>
                <p className="text-slate font-medium">Select all that apply. This helps Sihat AI understand your patterns.</p>
              </div>

              <div className="space-y-10">
                {(Object.keys(HABIT_OPTIONS) as Array<keyof typeof HABIT_OPTIONS>).map((type) => (
                  <div key={type} className="space-y-4">
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate px-1 block border-l-4 border-teal pl-3">{type} Patterns</label>
                    <div className="grid grid-cols-1 gap-2">
                       {HABIT_OPTIONS[type].map((option) => (
                         <button
                           key={option}
                           onClick={() => toggleHabit(type, option)}
                           className={cn(
                             "w-full text-left p-4 rounded-2xl border-2 font-bold text-sm transition-all",
                             formData.habits[type].includes(option) ? "bg-navy text-white border-navy" : "bg-white text-slate border-transparent hover:border-off-white"
                           )}
                         >
                           {option}
                         </button>
                       ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div 
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8 pb-10"
            >
              <div>
                <h2 className="text-2xl font-black text-navy mb-2">Set Your Core Targets</h2>
                <p className="text-slate font-medium">Customize your loop goals. Our AI uses these to calculate your progress scores.</p>
              </div>

              {/* Sleep Detailed */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-amber/10 flex items-center justify-center text-amber">
                    <Check size={16} />
                  </div>
                  <h3 className="font-black text-navy uppercase tracking-widest text-[11px]">Sleep Loop</h3>
                </div>
                <Card className="p-6 border-amber/10 bg-white space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate uppercase">Bedtime</label>
                      <input 
                        type="time" 
                        value={formData.sleepBedtime}
                        onChange={(e) => setFormData({ ...formData, sleepBedtime: e.target.value })}
                        className="w-full h-12 bg-off-white rounded-xl px-4 font-bold outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate uppercase">Wake Time</label>
                      <input 
                        type="time" 
                        value={formData.sleepWakeTime}
                        onChange={(e) => setFormData({ ...formData, sleepWakeTime: e.target.value })}
                        className="w-full h-12 bg-off-white rounded-xl px-4 font-bold outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-slate uppercase">Goal Duration (h)</label>
                      <input 
                        type="number"
                        inputMode="decimal"
                        step="0.5"
                        value={formData.sleepTarget}
                        onChange={(e) => setFormData({ ...formData, sleepTarget: e.target.value })}
                        className="w-16 h-8 text-right bg-off-white rounded-lg px-2 font-black text-amber outline-none"
                      />
                    </div>
                    <input 
                      type="range" min="4" max="12" step="0.5"
                      value={formData.sleepTarget}
                      onChange={(e) => setFormData({ ...formData, sleepTarget: e.target.value })}
                      className="w-full accent-amber"
                    />
                  </div>
                </Card>
              </div>

              {/* Nutrition Detailed */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-teal/10 flex items-center justify-center text-teal">
                    <Check size={16} />
                  </div>
                  <h3 className="font-black text-navy uppercase tracking-widest text-[11px]">Nutrition Loop</h3>
                </div>
                <Card className="p-6 border-teal/10 bg-white space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-slate uppercase">Daily Healthy Meals</label>
                      <input 
                        type="number"
                        inputMode="numeric"
                        value={formData.eatTarget}
                        onChange={(e) => setFormData({ ...formData, eatTarget: e.target.value })}
                        className="w-16 h-8 text-right bg-off-white rounded-lg px-2 font-black text-teal outline-none"
                      />
                    </div>
                    <input 
                      type="range" min="1" max="5" step="1"
                      value={formData.eatTarget}
                      onChange={(e) => setFormData({ ...formData, eatTarget: e.target.value })}
                      className="w-full accent-teal"
                    />
                  </div>
                  <div className="space-y-3 pt-2">
                    <label className="text-[10px] font-bold text-slate uppercase block mb-1">Impact Priority (1-5)</label>
                    {['protein', 'fat', 'fiber'].map((nutrient) => (
                      <div key={nutrient} className="flex items-center gap-4">
                        <span className="text-xs font-bold text-navy w-16 capitalize">{nutrient}</span>
                        <input 
                          type="range" min="1" max="5"
                          value={formData.nutritionTargets[nutrient as keyof typeof formData.nutritionTargets]}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            nutritionTargets: { ...formData.nutritionTargets, [nutrient as keyof typeof formData.nutritionTargets]: parseInt(e.target.value) } 
                          })}
                          className="flex-1 h-1.5 bg-off-white rounded-full accent-teal"
                        />
                        <input 
                          type="number"
                          inputMode="numeric"
                          value={formData.nutritionTargets[nutrient as keyof typeof formData.nutritionTargets]}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            nutritionTargets: { ...formData.nutritionTargets, [nutrient as keyof typeof formData.nutritionTargets]: parseInt(e.target.value) || 0 } 
                          })}
                          className="w-10 h-7 text-center bg-off-white rounded text-xs font-black text-teal outline-none"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-4 pt-4 border-t border-off-white">
                    <p className="text-[10px] font-bold text-slate uppercase block mb-2">Specific Daily Gram Targets</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                         <label className="text-[9px] font-black text-slate uppercase block mb-1">Protein (g)</label>
                         <input 
                            type="number" 
                            inputMode="numeric"
                            value={formData.nutritionTargets.protein}
                            onChange={(e) => setFormData({...formData, nutritionTargets: {...formData.nutritionTargets, protein: parseInt(e.target.value) || 0}})}
                            className="w-full h-11 bg-off-white rounded-xl px-3 font-bold text-sm outline-none border-2 border-transparent focus:border-teal transition-all"
                         />
                      </div>
                      <div>
                         <label className="text-[9px] font-black text-slate uppercase block mb-1">Fat (g)</label>
                         <input 
                            type="number" 
                            inputMode="numeric"
                            value={formData.nutritionTargets.fat}
                            onChange={(e) => setFormData({...formData, nutritionTargets: {...formData.nutritionTargets, fat: parseInt(e.target.value) || 0}})}
                            className="w-full h-11 bg-off-white rounded-xl px-3 font-bold text-sm outline-none border-2 border-transparent focus:border-teal transition-all"
                         />
                      </div>
                      <div>
                         <label className="text-[9px] font-black text-slate uppercase block mb-1">Fiber (g)</label>
                         <input 
                            type="number" 
                            inputMode="numeric"
                            value={formData.nutritionTargets.fiber}
                            onChange={(e) => setFormData({...formData, nutritionTargets: {...formData.nutritionTargets, fiber: parseInt(e.target.value) || 0}})}
                            className="w-full h-11 bg-off-white rounded-xl px-3 font-bold text-sm outline-none border-2 border-transparent focus:border-teal transition-all"
                         />
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Activity Detailed */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-violet/10 flex items-center justify-center text-violet">
                    <Check size={16} />
                  </div>
                  <h3 className="font-black text-navy uppercase tracking-widest text-[11px]">Activity Loop</h3>
                </div>
                <Card className="p-6 border-violet/10 bg-white space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-slate uppercase">Weekly Frequency</label>
                      <input 
                        type="number"
                        inputMode="numeric"
                        value={formData.moveTarget}
                        onChange={(e) => setFormData({ ...formData, moveTarget: e.target.value })}
                        className="w-16 h-8 text-right bg-off-white rounded-lg px-2 font-black text-violet outline-none"
                      />
                    </div>
                    <input 
                      type="range" min="1" max="7" step="1"
                      value={formData.moveTarget}
                      onChange={(e) => setFormData({ ...formData, moveTarget: e.target.value })}
                      className="w-full accent-violet"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-slate uppercase">Weekly Duration (min)</label>
                      <input 
                        type="number"
                        inputMode="numeric"
                        value={formData.moveDurationTarget}
                        onChange={(e) => setFormData({ ...formData, moveDurationTarget: e.target.value })}
                        className="w-16 h-8 text-right bg-off-white rounded-lg px-2 font-black text-violet outline-none"
                      />
                    </div>
                    <input 
                      type="range" min="30" max="600" step="15"
                      value={formData.moveDurationTarget}
                      onChange={(e) => setFormData({ ...formData, moveDurationTarget: e.target.value })}
                      className="w-full accent-violet"
                    />
                  </div>
                </Card>
              </div>

              {/* AI Preferences */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-navy/10 flex items-center justify-center text-navy">
                    <div className="w-1.5 h-1.5 rounded-full bg-navy animate-pulse" />
                  </div>
                  <h3 className="font-black text-navy uppercase tracking-widest text-[11px]">AI Feedback Focus</h3>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    'Sleep Consistency',
                    'Protein Intake Tips',
                    'Morning Energy Patterns',
                    'Weight Management Insights',
                    'Activity Efficiency'
                  ].map((pref) => (
                    <button
                      key={pref}
                      type="button"
                      onClick={() => {
                        const current = formData.aiFocusPreferences;
                        if (current.includes(pref)) {
                          setFormData({ ...formData, aiFocusPreferences: current.filter(p => p !== pref) });
                        } else {
                          setFormData({ ...formData, aiFocusPreferences: [...current, pref] });
                        }
                      }}
                      className={cn(
                        "w-full h-12 rounded-2xl flex items-center px-5 font-bold transition-all border-2 text-sm text-left",
                        formData.aiFocusPreferences.includes(pref) ? "bg-navy text-white border-navy" : "bg-white text-slate border-off-white hover:border-slate/20"
                      )}
                    >
                      {pref}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-3 p-5 rounded-3xl bg-teal/5 text-teal border border-teal/10">
                <Info size={18} className="shrink-0 mt-0.5" />
                <p className="text-xs font-bold leading-relaxed italic">
                  Tip: These targets define your "100%" score. Be ambitious but realistic.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="max-w-[420px] mx-auto w-full py-10 flex gap-4 mt-auto">
        {step > 1 && (
          <button 
            onClick={handleBack}
            className="w-16 h-16 rounded-2xl bg-white text-navy border-2 border-off-white flex items-center justify-center hover:bg-off-white transition-all shadow-sm"
          >
            <ChevronLeft size={24} />
          </button>
        )}
        <Button 
          domain={step === totalSteps ? "move" : "none"} 
          onClick={handleNext}
          disabled={!isStepValid()}
          className={cn(
            "flex-1 h-16 rounded-2xl text-lg font-black transition-all",
            step === totalSteps ? "" : "bg-navy text-white"
          )}
        >
          <div className="flex items-center justify-center gap-3">
            {step === totalSteps ? 'Complete Profile' : 'Continue'}
            {step === totalSteps ? <Check size={20} /> : <ChevronRight size={20} />}
          </div>
        </Button>
      </footer>
    </div>
  );
}
