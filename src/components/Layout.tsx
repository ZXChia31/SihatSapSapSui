/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Moon, Utensils, Zap, History, User } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

import { useFirebase } from '../contexts/FirebaseContext';

interface LayoutProps {
  children: ReactNode;
  userPhoto?: string;
}

export function Layout({ children, userPhoto: propUserPhoto }: LayoutProps) {
  const location = useLocation();
  const { profile } = useFirebase();
  const userPhoto = propUserPhoto || profile?.photoUrl;

  const tabs = [
    { id: 'today', label: 'Today', icon: Home, path: '/', color: 'text-yellow', border: 'bg-yellow' },
    { id: 'sleep', label: 'Sleep', icon: Moon, path: '/sleep', color: 'text-amber', border: 'bg-amber' },
    { id: 'eat', label: 'Eat', icon: Utensils, path: '/eat', color: 'text-teal', border: 'bg-teal' },
    { id: 'move', label: 'Move', icon: Zap, path: '/move', color: 'text-violet', border: 'bg-violet' },
    { id: 'history', label: 'History', icon: History, path: '/history', color: 'text-navy', border: 'bg-navy' },
  ];

  return (
    <div className="min-h-screen bg-white max-w-[420px] mx-auto relative flex flex-col shadow-2xl">
      <main className="flex-1 pb-[100px] overflow-y-auto px-5 pt-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Persistent Bottom Nav */}
      <nav className="fixed bottom-0 w-full max-w-[420px] h-[72px] bg-white border-t border-off-white flex items-center justify-around px-2 z-40">
        {tabs.map((tab) => (
          <NavLink
            key={tab.id}
            to={tab.path}
            className={({ isActive }) => cn(
              "flex flex-col items-center justify-center w-full h-full transition-all duration-300 relative",
              isActive ? tab.color : "text-light-slate"
            )}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div 
                    layoutId="tab-indicator"
                    className={cn("absolute top-0 w-8 h-1 rounded-b-full", tab.border)}
                  />
                )}
                <tab.icon size={24} className={cn("mb-1", isActive ? "fill-current" : "")} />
                <span className="text-[11px] font-bold uppercase tracking-wider">{tab.label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Profile Avatar Entry */}
        <NavLink 
          to="/profile"
          className="flex flex-col items-center justify-center w-full h-full transition-all"
        >
          <div className="w-9 h-9 rounded-full border-2 border-yellow overflow-hidden">
            {userPhoto ? (
              <img src={userPhoto} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-off-white flex items-center justify-center">
                <User size={20} className="text-light-slate" />
              </div>
            )}
          </div>
        </NavLink>
      </nav>
    </div>
  );
}
