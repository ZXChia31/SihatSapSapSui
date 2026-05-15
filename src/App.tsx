/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { FirebaseProvider, useFirebase } from './contexts/FirebaseContext';
import { LoginScreen } from './screens/LoginScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { SleepScreen } from './screens/SleepScreen';
import { EatScreen } from './screens/EatScreen';
import { MoveScreen } from './screens/MoveScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { signIn } from './lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from './lib/firebase';
import { User } from './types';

function AppRoutes() {
  const { user, profile, loading, refreshProfile } = useFirebase();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-navy border-t-yellow rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onSignIn={signIn} />;
  }

  if (!profile || !profile.onboardingComplete) {
    const handleComplete = async (onboardingData: Partial<User>) => {
      if (!user) return;
      const userPath = `users/${user.uid}`;
      const userRef = doc(db, userPath);
      const newUser: User = {
        uid: user.uid,
        displayName: onboardingData.displayName || user.displayName || 'Guest',
        email: user.email || '',
        photoUrl: user.photoURL || '',
        sleepTargetBedtime: onboardingData.sleepTargetBedtime || '22:30',
        sleepTargetWakeTime: onboardingData.sleepTargetWakeTime || '06:30',
        sleepTargetHours: onboardingData.sleepTargetHours || 8,
        weeklyActivityTarget: onboardingData.weeklyActivityTarget || 3,
        createdAt: new Date().toISOString(),
        onboardingComplete: true
      };
      try {
        await setDoc(userRef, newUser);
        await refreshProfile();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, userPath);
      }
    };

    return <OnboardingScreen onComplete={handleComplete} />;
  }

  return (
    <Routes>
      <Route path="/" element={<DashboardScreen />} />
      <Route path="/sleep" element={<SleepScreen />} />
      <Route path="/eat" element={<EatScreen />} />
      <Route path="/move" element={<MoveScreen />} />
      <Route path="/history" element={<HistoryScreen />} />
      <Route path="/profile" element={<ProfileScreen />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <FirebaseProvider>
        <AppRoutes />
      </FirebaseProvider>
    </Router>
  );
}
