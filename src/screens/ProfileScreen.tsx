/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Layout } from '../components/Layout';
import { Card, Button } from '../components/UI';
import { useFirebase } from '../contexts/FirebaseContext';
import { signOut, db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { User, LogOut, Settings, Bell, CreditCard, HelpCircle, Edit2, X, Camera, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { OperationType, handleFirestoreError } from '../lib/firebase';

export function ProfileScreen() {
  const { profile, user } = useFirebase();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  // Edit State
  const [editName, setEditName] = useState(profile?.displayName || '');
  const [editPhoto, setEditPhoto] = useState(profile?.photoUrl || '');
  const [editSleepTarget, setEditSleepTarget] = useState(profile?.sleepTargetHours?.toString() || '8');
  const [editMoveTarget, setEditMoveTarget] = useState(profile?.weeklyActivityTarget?.toString() || '3');
  const [editEatTarget, setEditEatTarget] = useState(profile?.dailyHealthyMealTarget?.toString() || '3');

  const handleUpdateProfile = async () => {
    if (!user) return;
    const path = `users`;
    try {
      await updateDoc(doc(db, path, user.uid), {
        displayName: editName,
        photoUrl: editPhoto,
        sleepTargetHours: parseFloat(editSleepTarget),
        weeklyActivityTarget: parseInt(editMoveTarget),
        dailyHealthyMealTarget: parseInt(editEatTarget)
      });
      setIsEditing(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${path}/${user.uid}`);
    }
  };

  const menuItems = [
    { id: 'notifications', icon: Bell, label: 'Notifications', color: 'text-slate' },
    { id: 'account', icon: Settings, label: 'Account Settings', color: 'text-slate' },
    { id: 'subscription', icon: CreditCard, label: 'Subscription', color: 'text-slate' },
    { id: 'help', icon: HelpCircle, label: 'Help & Support', color: 'text-slate' },
  ];

  return (
    <Layout userPhoto={profile?.photoUrl}>
      <header className="mb-10 flex flex-col items-center">
        <div className="relative">
          <div className="w-24 h-24 rounded-full border-4 border-yellow shadow-lifted overflow-hidden mb-4 bg-off-white flex items-center justify-center">
            {profile?.photoUrl ? (
              <img src={profile.photoUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User size={48} className="text-light-slate" />
            )}
          </div>
          <button 
            onClick={() => setIsEditing(true)}
            className="absolute bottom-4 right-0 w-8 h-8 rounded-full bg-navy text-white flex items-center justify-center border-4 border-white"
          >
            <Edit2 size={14} />
          </button>
        </div>
        <h2 className="text-2xl font-black text-navy leading-none mb-1">{profile?.displayName}</h2>
        <p className="text-slate font-medium text-sm">{user?.email}</p>
      </header>

      <section className="mb-10">
        <h3 className="font-bold text-navy uppercase tracking-widest text-[11px] mb-4 px-1">Your Health Targets</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
           <Card className="bg-amber/5 border-l-amber p-4">
              <span className="text-[11px] font-bold text-slate uppercase block mb-1">Sleep Goal</span>
              <span className="text-xl font-black text-navy">{profile?.sleepTargetHours}h / night</span>
           </Card>
           <Card className="bg-teal/5 border-l-teal p-4">
              <span className="text-[11px] font-bold text-slate uppercase block mb-1">Eat Goal</span>
              <span className="text-xl font-black text-navy">{profile?.dailyHealthyMealTarget}x healthy / day</span>
           </Card>
           <Card className="bg-violet/5 border-l-violet p-4">
              <span className="text-[11px] font-bold text-slate uppercase block mb-1">Move Goal</span>
              <span className="text-xl font-black text-navy">{profile?.weeklyActivityTarget}x active / week</span>
           </Card>
        </div>
      </section>

      <section className="flex flex-col gap-2 mb-12">
        <h3 className="font-bold text-navy uppercase tracking-widest text-[11px] mb-2 px-1">Settings</h3>
        {menuItems.map((item, i) => (
          <button 
            key={i} 
            onClick={() => setActiveTab(item.id)}
            className="flex items-center justify-between p-4 bg-white border border-off-white rounded-card hover:bg-off-white/50 transition-colors"
          >
            <div className="flex items-center gap-3">
               <item.icon size={18} className={item.color} />
               <span className="font-bold text-navy text-[15px]">{item.label}</span>
            </div>
            <div className="text-slate opacity-40">
               <ChevronRight size={18} />
            </div>
          </button>
        ))}
      </section>

      <div className="pb-10">
        <Button variant="destructive" onClick={() => signOut()}>
          <div className="flex items-center gap-3">
             <LogOut size={20} />
             Log Out
          </div>
        </Button>
        <p className="text-center text-light-slate text-xs mt-6">Version 1.2.0 (SihatSapSapSui)</p>
      </div>

      {/* Profile Edit Overlay */}
      <AnimatePresence>
        {isEditing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-navy/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-5"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white w-full max-w-[420px] rounded-t-[32px] sm:rounded-[32px] p-8 pb-12 sm:pb-8 flex flex-col gap-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-navy">Edit Profile</h2>
                <button onClick={() => setIsEditing(false)} className="text-slate"><X /></button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate">Full Name</label>
                  <input 
                    type="text" 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full h-14 bg-off-white border-2 border-transparent focus:border-navy focus:bg-white rounded-2xl px-5 font-bold transition-all outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate">Avatar URL</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={editPhoto}
                      onChange={(e) => setEditPhoto(e.target.value)}
                      placeholder="https://..."
                      className="flex-1 h-14 bg-off-white border-2 border-transparent focus:border-navy focus:bg-white rounded-2xl px-5 font-bold transition-all outline-none"
                    />
                    <button className="w-14 h-14 bg-off-white rounded-2xl flex items-center justify-center text-slate">
                      <Camera size={20} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate">Sleep(h)</label>
                    <input 
                      type="number" 
                      inputMode="numeric"
                      value={editSleepTarget}
                      onChange={(e) => setEditSleepTarget(e.target.value)}
                      className="w-full h-12 bg-off-white border-2 border-transparent focus:border-navy focus:bg-white rounded-xl px-4 font-bold transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate">Eat(x)</label>
                    <input 
                      type="number" 
                      inputMode="numeric"
                      value={editEatTarget}
                      onChange={(e) => setEditEatTarget(e.target.value)}
                      className="w-full h-12 bg-off-white border-2 border-transparent focus:border-navy focus:bg-white rounded-xl px-4 font-bold transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate">Move(x)</label>
                    <input 
                      type="number" 
                      inputMode="numeric"
                      value={editMoveTarget}
                      onChange={(e) => setEditMoveTarget(e.target.value)}
                      className="w-full h-12 bg-off-white border-2 border-transparent focus:border-navy focus:bg-white rounded-xl px-4 font-bold transition-all outline-none"
                    />
                  </div>
                </div>
              </div>

              <Button domain="none" onClick={handleUpdateProfile} className="bg-navy text-white">
                Save Changes
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Overlay */}
      <AnimatePresence>
        {activeTab && (
          <motion.div 
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            className="fixed inset-0 bg-white z-[60] flex flex-col"
          >
            <div className="p-5 flex items-center gap-4 border-b border-off-white bg-white">
               <button onClick={() => setActiveTab(null)} className="text-navy">
                 <X size={24} />
               </button>
               <h2 className="text-xl font-black text-navy capitalize">{activeTab}</h2>
            </div>
            
            <main className="flex-1 p-8 overflow-y-auto">
               <div className="max-w-[420px] mx-auto space-y-8">
                  {activeTab === 'notifications' && (
                    <div className="space-y-6">
                       <p className="text-slate font-medium">Manage how you receive updates and activity nudges.</p>
                       {[
                         { label: 'Push Notifications', active: true },
                         { label: 'Email Insights', active: false },
                         { label: 'Activity Reminders', active: true },
                         { label: 'Sleep Consistency Alerts', active: true }
                       ].map((opt, i) => (
                         <div key={i} className="flex justify-between items-center bg-off-white/50 p-4 rounded-2xl">
                           <span className="font-bold text-navy">{opt.label}</span>
                           <div className={cn(
                             "w-12 h-6 rounded-full transition-colors relative",
                             opt.active ? "bg-teal" : "bg-light-slate"
                           )}>
                             <div className={cn(
                               "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                               opt.active ? "right-1" : "left-1"
                             )} />
                           </div>
                         </div>
                       ))}
                    </div>
                  )}

                  {activeTab === 'account' && (
                    <div className="space-y-6">
                       <p className="text-slate font-medium">Control your privacy and data exports.</p>
                       <button className="w-full text-left p-4 rounded-2xl bg-off-white font-bold text-navy">Export Health Data (JSON)</button>
                       <button className="w-full text-left p-4 rounded-2xl bg-off-white font-bold text-navy">Download Privacy Summary</button>
                       <button className="w-full text-left p-4 rounded-2xl border-2 border-red-500 text-red-500 font-black">DELETE ACCOUNT</button>
                    </div>
                  )}

                  {activeTab === 'subscription' && (
                    <div className="text-center py-12">
                       <div className="inline-block p-4 rounded-3xl bg-yellow/10 text-yellow font-black text-3xl mb-4">SPARK</div>
                       <h3 className="text-2xl font-black text-navy">You're on the Eternal Plan</h3>
                       <p className="text-slate font-medium mt-4">Enjoy full access to AI insights and guided loops forever.</p>
                    </div>
                  )}

                  {activeTab === 'help' && (
                    <div className="space-y-6">
                       <p className="text-slate font-medium">Need help with your health journey?</p>
                       <button className="w-full text-left p-4 rounded-2xl bg-off-white font-bold text-navy">Knowledge Base</button>
                       <button className="w-full text-left p-4 rounded-2xl bg-off-white font-bold text-navy">Contact Support</button>
                       <button className="w-full text-left p-4 rounded-2xl bg-off-white font-bold text-navy">Tweet @SihatSSS</button>
                    </div>
                  )}
               </div>
            </main>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
