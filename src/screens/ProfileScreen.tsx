/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Layout } from '../components/Layout';
import { Card, Button, ConfirmModal } from '../components/UI';
import { useFirebase } from '../contexts/FirebaseContext';
import { signOut, db, auth as firebaseAuth } from '../lib/firebase';
import { doc, updateDoc, query, collection, where, getDocs, deleteDoc } from 'firebase/firestore';
import { User, LogOut, Settings, Bell, CreditCard, HelpCircle, Edit2, X, ChevronRight, Mail, Copy, Check, Sparkles, RefreshCw, Upload, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { AVATAR_OPTIONS } from '../constants';
import { OperationType, handleFirestoreError } from '../lib/firebase';
import { format } from 'date-fns';

export function ProfileScreen() {
  const { profile, user, refreshProfile } = useFirebase();
  const navigate = useNavigate();
  const [showEmail, setShowEmail] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const adminEmail = 'chiazhengx_bi23@iluv.ums.edu.my';

  const handleEmailSupport = (type: 'default' | 'gmail') => {
    setShowEmail(true);
    const subject = 'SihatLoop Support Request';
    const body = `Hello SihatLoop Team,\n\nI need help with...`;
    
    if (type === 'gmail') {
      const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${adminEmail}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(url, '_blank');
    } else {
      window.location.href = `mailto:${adminEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
  };

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(adminEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy email:', err);
    }
  };
  const [activeTab, setActiveTab] = useState<string | null>(null);

  // Edit State
  const [editPhotoUrl, setEditPhotoUrl] = useState(profile?.photoUrl || '');
  const [editName, setEditName] = useState(profile?.displayName || '');
  const [editMoveTarget, setEditMoveTarget] = useState(profile?.weeklyActivityTarget?.toString() || '3');
  const [editMoveDurationTarget, setEditMoveDurationTarget] = useState(profile?.weeklyActivityDurationTarget?.toString() || '150');
  const [editEatTarget, setEditEatTarget] = useState(profile?.dailyHealthyMealTarget?.toString() || '3');
  const [editNutritionTargets, setEditNutritionTargets] = useState(profile?.nutritionTargets || { protein: 3, fat: 3, fiber: 3 });
  const [editSleepTarget, setEditSleepTarget] = useState(profile?.sleepTargetHours?.toString() || '8');
  const [editSleepBedtime, setEditSleepBedtime] = useState(profile?.sleepTargetBedtime || '23:00');
  const [editSleepWakeTime, setEditSleepWakeTime] = useState(profile?.sleepTargetWakeTime || '07:00');
  const [editAiFocusPreferences, setEditAiFocusPreferences] = useState<string[]>(profile?.aiFocusPreferences || []);
  const [editAge, setEditAge] = useState(profile?.age?.toString() || '');
  const [editWeight, setEditWeight] = useState(profile?.weight?.toString() || '');
  const [editHeight, setEditHeight] = useState(profile?.height?.toString() || '');
  const [editHabitSleep, setEditHabitSleep] = useState(profile?.habits?.sleep || '');
  const [editHabitEat, setEditHabitEat] = useState(profile?.habits?.eat || '');
  const [editHabitMove, setEditHabitMove] = useState(profile?.habits?.move || '');

  const [feedback, setFeedback] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleUpdateProfile = async () => {
    if (!user) return;
    const path = `users`;
    try {
      const w = parseFloat(editWeight);
      const h = parseFloat(editHeight) / 100;
      const bmi = (w > 0 && h > 0) ? parseFloat((w / (h * h)).toFixed(2)) : profile?.bmi;

      await updateDoc(doc(db, path, user.uid), {
        displayName: editName,
        photoUrl: editPhotoUrl,
        sleepTargetHours: parseFloat(editSleepTarget),
        sleepTargetBedtime: editSleepBedtime,
        sleepTargetWakeTime: editSleepWakeTime,
        weeklyActivityTarget: parseInt(editMoveTarget),
        weeklyActivityDurationTarget: parseInt(editMoveDurationTarget),
        dailyHealthyMealTarget: parseInt(editEatTarget),
        nutritionTargets: editNutritionTargets,
        aiFocusPreferences: editAiFocusPreferences,
        age: parseInt(editAge),
        weight: w,
        height: parseFloat(editHeight),
        bmi,
        habits: {
          sleep: editHabitSleep,
          eat: editHabitEat,
          move: editHabitMove
        }
      });
      setIsEditing(false);
      showFeedback('Profile updated successfully!');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${path}/${user.uid}`);
    }
  };

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleToggleSetting = async (key: string, current: boolean) => {
    if (!user || !profile) return;
    const path = `users`;
    try {
      await updateDoc(doc(db, path, user.uid), {
        [`settings.${key}`]: !current
      });
      showFeedback(`${key.replace(/([A-Z])/g, ' $1').trim()} updated!`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${path}/${user.uid}`);
    }
  };

  const handleExportData = async () => {
    if (!user) return;
    const collections = ['sleepLogs', 'mealLogs', 'activityLogs', 'loopScores'];
    const allData: Record<string, unknown[]> = {};
    
    try {
      for (const coll of collections) {
        const q = query(collection(db, coll), where('userId', '==', user.uid));
        const snap = await getDocs(q);
        allData[coll] = snap.docs.map(d => ({ ...(d.data() as Record<string, unknown>), id: d.id }));
      }
      
      const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `SihatLoop_Export_${format(new Date(), 'yyyy-MM-dd')}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'multiple');
    }
  };

  const handleDownloadPrivacy = () => {
    const content = `SihatSapSapSui Privacy Summary\nGenerated: ${new Date().toLocaleString()}\n\nYour data is personal. We store your health logs securely in Firebase. We only use this data to compute your health loops and provide AI insights. We do not sell your data. You can delete your account at any time.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'SihatLoop_Privacy_Summary.txt');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    try {
      // 1. Delete user documents
      const collections = ['sleepLogs', 'mealLogs', 'activityLogs', 'loopScores'];
      for (const coll of collections) {
         const q = query(collection(db, coll), where('userId', '==', user.uid));
         const snap = await getDocs(q);
         for (const d of snap.docs) {
            await deleteDoc(doc(db, coll, d.id));
         }
      }
      
      // 2. Delete user profile
      await deleteDoc(doc(db, 'users', user.uid));
      
      // 3. Delete auth user
      await user.delete();
      
      showFeedback('Account deleted successfully.');
      setTimeout(() => window.location.reload(), 2000);
    } catch (err: unknown) {
      const error = err as { code?: string };
      if (error.code === 'auth/requires-recent-login') {
        showFeedback('Security: Please sign out and in again before deleting.');
      } else {
        handleFirestoreError(err, OperationType.DELETE, 'user');
      }
    }
  };

  const menuItems = [
    { id: 'notifications', icon: Bell, label: 'Notifications', color: 'text-slate' },
    { id: 'account', icon: Settings, label: 'Account Settings', color: 'text-slate' },
    { id: 'subscription', icon: CreditCard, label: 'Subscription', color: 'text-slate' },
    { id: 'help', icon: HelpCircle, label: 'Help & Support', color: 'text-slate' },
  ];

  const handleSyncGooglePhoto = () => {
    if (firebaseAuth.currentUser?.photoURL) {
      setEditPhotoUrl(firebaseAuth.currentUser.photoURL);
      showFeedback('Google photo synced!');
    } else {
      showFeedback('No Google photo found.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) { // 500KB limit for base64 storage in Firestore
        showFeedback('Image too large (max 500KB)');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditPhotoUrl(reader.result as string);
        showFeedback('Photo uploaded!');
      };
      reader.readAsDataURL(file);
    }
  };

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

      {/* AI Usage Tracker */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="font-bold text-navy uppercase tracking-widest text-[11px] leading-none">AI Usage & Credit</h3>
          <span className="text-[10px] font-black text-teal uppercase tracking-tight bg-teal/10 px-2 py-0.5 rounded-full">Spark Plan</span>
        </div>
        <Card className="p-6 bg-gradient-to-br from-white to-off-white/50 border-navy/5 shadow-card relative overflow-hidden group">
          <div className="absolute -right-8 -top-8 text-navy/5 rotate-12 group-hover:rotate-45 transition-transform duration-700 pointer-events-none">
            <Sparkles size={120} />
          </div>
          
          <div className="relative z-10">
            <div className="flex justify-between items-end mb-4">
               <div>
                  <div className="text-[32px] font-black text-navy leading-none mb-1">
                    {profile?.aiUsage?.balance !== undefined ? profile.aiUsage.balance : Math.max(0, 100 - (profile?.aiUsage?.dailyRequests || 0))}
                  </div>
                  <div className="text-[11px] font-bold text-slate uppercase tracking-wider">Credits Remaining Today</div>
               </div>
               <button 
                 disabled={isSyncing}
                 onClick={async () => {
                   setIsSyncing(true);
                   try {
                     await refreshProfile();
                     showFeedback('Credits synced with server');
                   } catch {
                     showFeedback('Sync failed');
                   } finally {
                     setIsSyncing(false);
                   }
                 }}
                 className={cn(
                   "flex items-center gap-1.5 text-[9px] font-black uppercase bg-white px-3 py-1.5 rounded-full shadow-sm hover:shadow-md transition-all active:scale-95 border border-slate/5",
                   isSyncing ? "text-slate/40 opacity-50 cursor-not-allowed" : "text-navy"
                 )}
               >
                 <RefreshCw size={12} className={cn(isSyncing && "animate-spin")} /> 
                 {isSyncing ? 'Syncing...' : 'Sync'}
               </button>
            </div>
            
            <div className="space-y-1.5 mb-6">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-tight text-slate/60">
                <span>Loop Credit Balance</span>
                <span>{((100 - (profile?.aiUsage?.balance ?? (100 - (profile?.aiUsage?.dailyRequests || 0))))).toFixed(0)}% Utilized</span>
              </div>
              <div className="h-3 bg-off-white rounded-full overflow-hidden border border-slate/5 relative shadow-inner">
                <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${Math.min(100, 100 - (profile?.aiUsage?.balance ?? 100))}%` }}
                   className={cn(
                     "h-full rounded-full transition-all duration-1000 relative",
                     (profile?.aiUsage?.balance ?? 100) < 20 ? "bg-red-500" : (profile?.aiUsage?.balance ?? 100) < 50 ? "bg-amber" : "bg-teal"
                   )}
                >
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.2)_50%,transparent_100%)] animate-[shimmer_2s_infinite]" />
                </motion.div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-off-white">
               <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal shadow-pulse shadow-teal/50" />
                  <span className="text-[10px] font-black text-navy uppercase tracking-tighter">Real-time Sync</span>
               </div>
               <div className="text-right text-[9px] font-black text-slate/40 uppercase">
                  Resets: 00:00 Local
               </div>
            </div>
          </div>
        </Card>
        <p className="mt-3 px-4 text-[10px] font-medium text-slate/40 text-center italic">
          AI functions are processed by Gemini-powered models. Usage is reset daily.
        </p>
      </section>

      <section className="mb-10">
        <h3 className="font-bold text-navy uppercase tracking-widest text-[11px] mb-4 px-1">Health Profile</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
           <Card className="bg-navy/5 p-4">
              <span className="text-[10px] font-bold text-slate uppercase block mb-1">Age</span>
              <span className="text-lg font-black text-navy">{profile?.age || '--'} yrs</span>
           </Card>
           <Card className="bg-navy/5 p-4">
              <span className="text-[10px] font-bold text-slate uppercase block mb-1">Weight</span>
              <span className="text-lg font-black text-navy">{profile?.weight || '--'} kg</span>
           </Card>
           <Card className="bg-navy/5 p-4">
              <span className="text-[10px] font-bold text-slate uppercase block mb-1">Height</span>
              <span className="text-lg font-black text-navy">{profile?.height || '--'} cm</span>
           </Card>
           <Card className="bg-navy/5 p-4">
              <span className="text-[10px] font-bold text-slate uppercase block mb-1">BMI</span>
              <span className="text-lg font-black text-navy">{profile?.bmi?.toFixed(2).replace(/\.00$/, '') || '--'}</span>
           </Card>
        </div>

        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="font-bold text-navy uppercase tracking-widest text-[11px] leading-none">Your Habits</h3>
          <button 
            onClick={() => navigate('/habits')}
            className="flex items-center gap-1 text-[10px] font-black text-navy uppercase tracking-tight hover:opacity-70 transition-opacity"
          >
            View All <ChevronRight size={14} />
          </button>
        </div>
        <Card 
          onClick={() => navigate('/habits')}
          className="p-5 border-2 border-dashed border-slate/20 bg-off-white/30 flex items-center justify-center gap-4 group hover:border-navy/20 hover:bg-white transition-all cursor-pointer"
        >
          <div className="w-10 h-10 rounded-full bg-navy/5 flex items-center justify-center text-navy group-hover:scale-110 transition-transform">
            <CheckCircle2 size={20} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-navy">Manage Daily Habits</p>
            <p className="text-[10px] font-bold text-slate uppercase tracking-wider">{(profile?.completedHabits?.length || 0)} Completed Today</p>
          </div>
          <ChevronRight size={18} className="text-slate/30" />
        </Card>
      </section>

      <section className="mb-10">
        <h3 className="font-bold text-navy uppercase tracking-widest text-[11px] mb-4 px-1 leading-none">Your Loop Targets</h3>
        <div className="grid grid-cols-1 gap-4">
           {/* Sleep Target */}
           <Card className="bg-amber/5 border-amber/10 p-5 group hover:bg-amber/10 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-[10px] font-black text-amber uppercase tracking-widest mb-1">Sleep Loop</h4>
                  <span className="text-xl font-black text-navy">{profile?.sleepTargetHours}h Goal</span>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate uppercase">Optimal Window</p>
                  <p className="text-sm font-black text-navy">{profile?.sleepTargetBedtime} - {profile?.sleepTargetWakeTime}</p>
                </div>
              </div>
              <div className="h-1.5 bg-off-white rounded-full overflow-hidden">
                <div className="h-full bg-amber w-[80%] rounded-full opacity-60" />
              </div>
           </Card>

           {/* Eat Target */}
           <Card className="bg-teal/5 border-teal/10 p-5 group hover:bg-teal/10 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-[10px] font-black text-teal uppercase tracking-widest mb-1">Nutrition Loop</h4>
                  <span className="text-xl font-black text-navy">{profile?.dailyHealthyMealTarget}x Healthy Meals</span>
                </div>
                <div className="flex gap-2">
                  {profile?.nutritionTargets && Object.entries(profile.nutritionTargets).map(([key, val]) => (
                    <div key={key} className="flex flex-col items-center min-w-8">
                       <span className="text-[8px] font-black text-slate uppercase">{key[0]}</span>
                       <span className="text-xs font-black text-navy">{val as number}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="h-1.5 bg-off-white rounded-full overflow-hidden">
                <div className="h-full bg-teal w-[65%] rounded-full opacity-60" />
              </div>
           </Card>

           {/* Move Target */}
           <Card className="bg-violet/5 border-violet/10 p-5 group hover:bg-violet/10 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-[10px] font-black text-violet uppercase tracking-widest mb-1">Activity Loop</h4>
                  <span className="text-xl font-black text-navy">{profile?.weeklyActivityTarget}x Weekly sessions</span>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate uppercase">Minutes Target</p>
                  <p className="text-sm font-black text-navy">{profile?.weeklyActivityDurationTarget || 150}m / week</p>
                </div>
              </div>
              <div className="h-1.5 bg-off-white rounded-full overflow-hidden">
                <div className="h-full bg-violet w-[40%] rounded-full opacity-60" />
              </div>
           </Card>

           {/* AI Focus Preferences Display */}
           <Card className="bg-navy/5 border-navy/10 p-5">
              <h4 className="text-[10px] font-black text-navy uppercase tracking-widest mb-3">AI Focus Preferences</h4>
              <div className="flex flex-wrap gap-2">
                {profile?.aiFocusPreferences && profile.aiFocusPreferences.length > 0 ? (
                  profile.aiFocusPreferences.map((pref, i) => (
                    <span key={i} className="px-3 py-1 rounded-full bg-white text-navy font-bold text-[10px] border border-navy/5 shadow-sm">
                      {pref}
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] font-medium text-slate/60 italic">No specific focus selected</span>
                )}
              </div>
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
        <Button 
          variant="destructive" 
          onClick={() => {
            if (!showLogoutConfirm) {
              setShowLogoutConfirm(true);
              setTimeout(() => setShowLogoutConfirm(false), 3000);
            } else {
              signOut();
            }
          }}
          className={cn(
            "transition-all duration-300",
            showLogoutConfirm ? "bg-red-600 scale-[1.02]" : ""
          )}
        >
          <div className="flex items-center gap-3">
             <LogOut size={20} />
             {showLogoutConfirm ? 'Tap again to Log Out' : 'Log Out'}
          </div>
        </Button>
        <p className="text-center text-light-slate text-xs mt-6">Version 1.2.0 (SihatLoop)</p>
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
              className="bg-white w-full max-w-[460px] rounded-t-[32px] sm:rounded-[32px] p-8 pb-12 sm:pb-8 flex flex-col gap-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-navy">Edit Profile</h2>
                <button onClick={() => setIsEditing(false)} className="text-slate p-2 hover:bg-off-white rounded-full transition-colors"><X size={20} /></button>
              </div>

              {/* Photo Selector */}
              <div className="space-y-4 pt-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate px-1">Profile Picture</label>
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-full border-4 border-yellow shadow-sm overflow-hidden bg-off-white flex items-center justify-center shrink-0">
                    {editPhotoUrl ? (
                      <img src={editPhotoUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <User size={40} className="text-light-slate" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                     <div className="flex gap-2">
                        <button 
                          onClick={handleSyncGooglePhoto}
                          className="flex-1 flex items-center justify-center gap-2 bg-off-white hover:bg-navy hover:text-white h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          <RefreshCw size={14} /> Sync Google
                        </button>
                        <label className="flex-1 flex items-center justify-center gap-2 bg-off-white hover:bg-navy hover:text-white h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer">
                          <Upload size={14} /> Upload
                          <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                        </label>
                     </div>
                     <p className="text-[9px] text-slate font-medium italic">Max 500KB. Try syncing your Gmail photo first!</p>
                  </div>
                </div>

                <div className="space-y-3">
                   <p className="text-[10px] font-bold text-slate uppercase tracking-wider">Or choose an avatar:</p>
                   <div className="grid grid-cols-4 gap-2">
                      {AVATAR_OPTIONS.map((avatar) => (
                        <button 
                          key={avatar.id}
                          onClick={() => setEditPhotoUrl(avatar.url)}
                          className={cn(
                            "w-full aspect-square rounded-xl overflow-hidden border-2 transition-all p-1",
                            editPhotoUrl === avatar.url ? "border-navy bg-navy/10 scale-105" : "border-transparent bg-off-white hover:border-slate/20"
                          )}
                        >
                          <img src={avatar.url} alt="Avatar" className="w-full h-full object-cover" />
                        </button>
                      ))}
                   </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate px-1">Full Name</label>
                    <input 
                      type="text" 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full h-14 bg-off-white border-2 border-transparent focus:border-navy focus:bg-white rounded-2xl px-5 font-bold transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate px-1">Age</label>
                    <input 
                      type="number" 
                      inputMode="numeric"
                      value={editAge}
                      onChange={(e) => setEditAge(e.target.value)}
                      className="w-full h-14 bg-off-white border-2 border-transparent focus:border-navy focus:bg-white rounded-2xl px-5 font-bold transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate px-1">Height (cm)</label>
                    <input 
                      type="number" 
                      inputMode="numeric"
                      value={editHeight}
                      onChange={(e) => setEditHeight(e.target.value)}
                      className="w-full h-14 bg-off-white border-2 border-transparent focus:border-navy focus:bg-white rounded-2xl px-5 font-bold transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate px-1">Weight (kg)</label>
                    <input 
                      type="number" 
                      inputMode="numeric"
                      value={editWeight}
                      onChange={(e) => setEditWeight(e.target.value)}
                      className="w-full h-14 bg-off-white border-2 border-transparent focus:border-navy focus:bg-white rounded-2xl px-5 font-bold transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate px-1">Your Habit Narratives</label>
                  <div className="space-y-3">
                    <textarea 
                      placeholder="Sleep Habits..."
                      value={editHabitSleep}
                      onChange={(e) => setEditHabitSleep(e.target.value)}
                      className="w-full h-20 bg-off-white border-2 border-transparent focus:border-amber/50 focus:bg-white rounded-xl p-4 font-bold text-sm transition-all outline-none resize-none"
                    />
                    <textarea 
                      placeholder="Eating Habits..."
                      value={editHabitEat}
                      onChange={(e) => setEditHabitEat(e.target.value)}
                      className="w-full h-20 bg-off-white border-2 border-transparent focus:border-teal/50 focus:bg-white rounded-xl p-4 font-bold text-sm transition-all outline-none resize-none"
                    />
                    <textarea 
                      placeholder="Move Habits..."
                      value={editHabitMove}
                      onChange={(e) => setEditHabitMove(e.target.value)}
                      className="w-full h-20 bg-off-white border-2 border-transparent focus:border-violet/50 focus:bg-white rounded-xl p-4 font-bold text-sm transition-all outline-none resize-none"
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-off-white">
                  <h3 className="text-xs font-black text-navy uppercase tracking-[0.2em]">Detailed Loop Targets</h3>
                  
                  {/* Sleep Detailed Edit */}
                  <div className="space-y-3 p-4 bg-amber/5 rounded-2xl border border-amber/10">
                    <p className="text-[10px] font-black text-amber uppercase tracking-widest">Sleep Targets</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate uppercase">Bedtime</span>
                        <input type="time" value={editSleepBedtime} onChange={(e) => setEditSleepBedtime(e.target.value)} className="w-full h-11 bg-white rounded-xl px-3 font-bold text-sm outline-none shadow-sm" />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate uppercase">Wake Time</span>
                        <input type="time" value={editSleepWakeTime} onChange={(e) => setEditSleepWakeTime(e.target.value)} className="w-full h-11 bg-white rounded-xl px-3 font-bold text-sm outline-none shadow-sm" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[9px] font-bold text-slate uppercase">Hours Target</span>
                        <input 
                          type="number"
                          inputMode="decimal"
                          step="0.5"
                          value={editSleepTarget}
                          onChange={(e) => setEditSleepTarget(e.target.value)}
                          className="w-14 h-6 text-right bg-white rounded-lg px-2 font-black text-amber outline-none shadow-sm"
                        />
                      </div>
                      <input type="range" min="4" max="12" step="0.5" value={editSleepTarget} onChange={(e) => setEditSleepTarget(e.target.value)} className="w-full accent-amber" />
                    </div>
                  </div>

                  {/* Eat Detailed Edit */}
                  <div className="space-y-3 p-4 bg-teal/5 rounded-2xl border border-teal/10">
                    <p className="text-[10px] font-black text-teal uppercase tracking-widest">Nutrition Targets</p>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[9px] font-bold text-slate uppercase">Daily Healthy Meals</span>
                        <input 
                          type="number"
                          inputMode="numeric"
                          value={editEatTarget}
                          onChange={(e) => setEditEatTarget(e.target.value)}
                          className="w-14 h-6 text-right bg-white rounded-lg px-2 font-black text-teal outline-none shadow-sm"
                        />
                      </div>
                      <input type="range" min="1" max="5" step="1" value={editEatTarget} onChange={(e) => setEditEatTarget(e.target.value)} className="w-full accent-teal" />
                    </div>
                    <div className="space-y-3 pt-2 border-t border-teal/10">
                      <p className="text-[9px] font-bold text-slate uppercase block mb-1">Nutritional Gram Targets (Daily)</p>
                      <div className="grid grid-cols-3 gap-2">
                        {['protein', 'fat', 'fiber'].map(n => (
                          <div key={n} className="space-y-1">
                            <span className="text-[8px] font-bold text-navy uppercase block">{n} (g)</span>
                            <input 
                              type="number" 
                              inputMode="numeric"
                              value={editNutritionTargets[n as keyof typeof editNutritionTargets]} 
                              onChange={(e) => setEditNutritionTargets({...editNutritionTargets, [n as keyof typeof editNutritionTargets]: parseInt(e.target.value) || 0})} 
                              className="w-full h-10 bg-white rounded-xl px-2 font-bold text-xs outline-none shadow-sm border border-teal/5" 
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2 pt-1 border-t border-teal/10">
                      <span className="text-[9px] font-bold text-slate uppercase block mb-1">Impact Priority (1-5)</span>
                      {['protein', 'fat', 'fiber'].map(n => (
                        <div key={n} className="flex items-center gap-3">
                          <span className="text-[10px] font-bold text-navy w-14 capitalize">{n}</span>
                          <input 
                            type="range" min="1" max="5" 
                            value={editNutritionTargets[n as keyof typeof editNutritionTargets]} 
                            onChange={(e) => setEditNutritionTargets({...editNutritionTargets, [n as keyof typeof editNutritionTargets]: parseInt(e.target.value)})} 
                            className="flex-1 h-1 bg-teal/20 rounded-full accent-teal" 
                          />
                          <input 
                            type="number"
                            inputMode="numeric"
                            value={editNutritionTargets[n as keyof typeof editNutritionTargets]} 
                            onChange={(e) => setEditNutritionTargets({...editNutritionTargets, [n as keyof typeof editNutritionTargets]: parseInt(e.target.value) || 0})} 
                            className="w-10 h-6 text-center bg-white rounded font-black text-teal text-[10px] outline-none shadow-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Move Detailed Edit */}
                  <div className="space-y-3 p-4 bg-violet/5 rounded-2xl border border-violet/10">
                    <p className="text-[10px] font-black text-violet uppercase tracking-widest">Activity Targets</p>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[9px] font-bold text-slate uppercase">Weekly Sessions</span>
                        <input 
                          type="number"
                          inputMode="numeric"
                          value={editMoveTarget}
                          onChange={(e) => setEditMoveTarget(e.target.value)}
                          className="w-14 h-6 text-right bg-white rounded-lg px-2 font-black text-violet outline-none shadow-sm"
                        />
                      </div>
                      <input type="range" min="1" max="7" step="1" value={editMoveTarget} onChange={(e) => setEditMoveTarget(e.target.value)} className="w-full accent-violet" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[9px] font-bold text-slate uppercase">Weekly Minutes</span>
                        <input 
                          type="number"
                          inputMode="numeric"
                          value={editMoveDurationTarget}
                          onChange={(e) => setEditMoveDurationTarget(e.target.value)}
                          className="w-14 h-6 text-right bg-white rounded-lg px-2 font-black text-violet outline-none shadow-sm"
                        />
                      </div>
                      <input type="range" min="30" max="600" step="15" value={editMoveDurationTarget} onChange={(e) => setEditMoveDurationTarget(e.target.value)} className="w-full accent-violet" />
                    </div>
                  </div>

                  {/* AI Preferences Edit */}
                  <div className="space-y-4 p-4 bg-navy/5 rounded-2xl border border-navy/10">
                    <p className="text-[10px] font-black text-navy uppercase tracking-widest">AI Feedback Focus</p>
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
                            if (editAiFocusPreferences.includes(pref)) {
                              setEditAiFocusPreferences(editAiFocusPreferences.filter(p => p !== pref));
                            } else {
                              setEditAiFocusPreferences([...editAiFocusPreferences, pref]);
                            }
                          }}
                          className={cn(
                            "w-full h-10 rounded-xl flex items-center px-4 font-bold transition-all border-2 text-[11px] text-left",
                            editAiFocusPreferences.includes(pref) ? "bg-navy text-white border-navy" : "bg-white text-slate border-off-white hover:border-slate/20"
                          )}
                        >
                          {pref}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <Button domain="none" onClick={handleUpdateProfile} className="bg-navy text-white h-14 rounded-2xl shadow-xl">
                Update Profile
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
                       <p className="text-slate font-medium text-sm leading-relaxed">Manage how you receive updates and activity nudges. These settings are saved in real-time.</p>
                       {[
                         { label: 'Push Notifications', key: 'pushNotifications', active: profile?.settings?.pushNotifications ?? true },
                         { label: 'Activity Reminders', key: 'activityReminders', active: profile?.settings?.activityReminders ?? true },
                         { label: 'Sleep Consistency Alerts', key: 'sleepAlerts', active: profile?.settings?.sleepAlerts ?? true },
                         { label: 'AI Deep Insights', key: 'aiInsights', active: profile?.settings?.aiInsights ?? true },
                         { label: 'Email Insights', key: 'emailInsights', active: profile?.settings?.emailInsights ?? false },
                       ].map((opt, i) => (
                         <div key={i} className="flex justify-between items-center bg-off-white/50 p-5 rounded-[20px] transition-all hover:bg-off-white active:scale-[0.99]" onClick={() => handleToggleSetting(opt.key, opt.active)}>
                           <span className="font-bold text-navy h-full flex items-center">{opt.label}</span>
                           <button 
                             className={cn(
                               "w-12 h-6 rounded-full transition-colors relative pointer-events-none",
                               opt.active ? "bg-teal" : "bg-light-slate"
                             )}
                           >
                             <div className={cn(
                               "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                               opt.active ? "right-1" : "left-1"
                             )} />
                           </button>
                         </div>
                       ))}
                    </div>
                  )}

                  {activeTab === 'account' && (
                    <div className="space-y-6">
                       <p className="text-slate font-medium text-sm leading-relaxed">Control your privacy and data exports. Your data is your property.</p>
                       <button onClick={handleExportData} className="w-full flex items-center justify-between p-5 rounded-[20px] bg-off-white hover:bg-navy hover:text-white transition-all font-bold text-navy group">
                          <span>Export Health Data (JSON)</span>
                          <ChevronRight size={18} className="opacity-40 group-hover:opacity-100" />
                       </button>
                       <button onClick={handleDownloadPrivacy} className="w-full flex items-center justify-between p-5 rounded-[20px] bg-off-white hover:bg-navy hover:text-white transition-all font-bold text-navy group">
                          <span>Download Privacy Summary</span>
                          <ChevronRight size={18} className="opacity-40 group-hover:opacity-100" />
                       </button>
                       <div className="pt-6 mt-2 border-t border-off-white">
                         <p className="text-[11px] text-red-400 mb-4 px-1 uppercase font-black tracking-widest leading-none">Danger Zone</p>
                         <button 
                           onClick={() => setShowDeleteConfirm(true)}
                           className="w-full text-center p-5 rounded-[20px] border-2 border-red-500 text-red-500 font-black hover:bg-red-500 hover:text-white transition-all"
                         >
                           DELETE ACCOUNT PERMANENTLY
                         </button>
                       </div>
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
                       <p className="text-slate font-medium text-sm leading-relaxed">Need help with your health journey? Our team is here to support you.</p>
                       
                       <div className="space-y-3">
                         <button 
                           onClick={() => navigate('/faq')}
                           className="w-full flex items-center justify-between p-5 rounded-[20px] bg-navy text-white hover:bg-navy/90 transition-all font-bold group"
                         >
                            <div className="flex items-center gap-3">
                               <HelpCircle size={20} className="text-teal" />
                               <span>Frequently Asked Questions (FAQs)</span>
                            </div>
                            <ChevronRight size={18} className="opacity-60 group-hover:opacity-100" />
                         </button>
                       </div>

                       <div className="pt-6 border-t border-off-white space-y-4">
                         <h4 className="text-[11px] font-black uppercase tracking-widest text-slate px-1">Still Need Help?</h4>
                         
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                           <button 
                             onClick={() => handleEmailSupport('default')} 
                             className="flex flex-col items-start gap-1 p-5 rounded-[20px] bg-off-white hover:bg-navy hover:text-white transition-all group text-left"
                           >
                             <Mail size={18} className="text-teal mb-1" />
                             <span className="font-bold text-navy group-hover:text-white">Default Mail</span>
                             <span className="text-[10px] opacity-40 group-hover:opacity-70">Outlook, Apple Mail, etc.</span>
                           </button>

                           <button 
                             onClick={() => handleEmailSupport('gmail')} 
                             className="flex flex-col items-start gap-1 p-5 rounded-[20px] bg-off-white hover:bg-navy hover:text-white transition-all group text-left"
                           >
                             <div className="flex items-center gap-1.5 mb-1">
                               <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                               <span className="text-[10px] font-bold text-red-500 group-hover:text-red-300">GMAIL</span>
                             </div>
                             <span className="font-bold text-navy group-hover:text-white">Open in Gmail</span>
                             <span className="text-[10px] opacity-40 group-hover:opacity-70">Opens in web browser</span>
                           </button>
                         </div>

                         <AnimatePresence>
                           {showEmail && (
                             <motion.div 
                               initial={{ opacity: 0, y: 10 }}
                               animate={{ opacity: 1, y: 0 }}
                               className="p-5 rounded-[24px] bg-teal/5 border border-teal/10 space-y-3"
                             >
                               <p className="text-xs font-bold text-teal/80 uppercase tracking-wider">Direct Developer/Admin Support</p>
                               <div className="flex items-center justify-between bg-white p-3 px-4 rounded-xl border border-teal/20">
                                 <code className="text-navy font-bold text-sm select-all">{adminEmail}</code>
                                 <button 
                                   onClick={copyEmail}
                                   className="p-2 hover:bg-teal/10 rounded-lg transition-colors text-teal"
                                   title="Copy Email Address"
                                 >
                                   {copied ? <Check size={16} /> : <Copy size={16} />}
                                 </button>
                               </div>
                               <p className="text-[11px] text-slate/60 leading-relaxed italic">
                                 You can copy our email address above or use the quick buttons to open your favorite email app. We usually respond within 24-48 hours.
                               </p>
                             </motion.div>
                           )}
                         </AnimatePresence>
                       </div>
                    </div>
                  )}
               </div>
            </main>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal 
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteAccount}
        title="Delete Account?"
        message="This action is irreversible. All your sleep, meal, and activity logs will be permanently erased from our servers."
      />

      <AnimatePresence>
        {feedback && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-navy text-white px-6 py-3 rounded-full font-bold shadow-2xl z-[100] whitespace-nowrap"
          >
            {feedback}
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
