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
import { WorkoutsScreen } from './screens/WorkoutsScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { FAQScreen } from './screens/FAQScreen';
import { AnalysisDetailScreen } from './screens/AnalysisDetailScreen';
import { YourHabitsScreen } from './screens/YourHabitsScreen';
import { signIn } from './lib/firebase';

function AppRoutes() {
  const { user, profile, loading } = useFirebase();

  if (loading) {
    return (
      <div className="min-h-screen bg-off-white flex flex-col items-center justify-center p-8 text-center text-navy">
        <div className="w-16 h-16 border-4 border-teal border-t-transparent rounded-full animate-spin mb-6" />
        <h2 className="text-xl font-black animate-pulse uppercase tracking-widest text-[11px]">Syncing loops...</h2>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onSignIn={signIn} />;
  }

  if (!profile || !profile.onboardingComplete) {
    return (
      <Routes>
        <Route path="/onboarding" element={<OnboardingScreen />} />
        <Route path="*" element={<Navigate to="/onboarding" />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<DashboardScreen />} />
      <Route path="/sleep" element={<SleepScreen />} />
      <Route path="/eat" element={<EatScreen />} />
      <Route path="/move" element={<MoveScreen />} />
      <Route path="/workouts" element={<WorkoutsScreen />} />
      <Route path="/history" element={<HistoryScreen />} />
      <Route path="/profile" element={<ProfileScreen />} />
      <Route path="/habits" element={<YourHabitsScreen />} />
      <Route path="/faq" element={<FAQScreen />} />
      <Route path="/analysis/:domain" element={<AnalysisDetailScreen />} />
      <Route path="/onboarding" element={<OnboardingScreen />} />
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
