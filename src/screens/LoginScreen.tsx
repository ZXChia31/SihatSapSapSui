/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Button } from '../components/UI';
import { Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginScreenProps {
  onSignIn: () => void;
}

export function LoginScreen({ onSignIn }: LoginScreenProps) {
  const handleSignIn = async () => {
    try {
      await onSignIn();
    } catch (err) {
      console.warn('Sign in cancelled or failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-off-white flex items-center justify-center p-6 relative overflow-hidden">
      {/* Dynamic Background Blobs - Vibrant Palette */}
      <motion.div 
        animate={{ 
          scale: [1, 1.4, 1],
          x: [0, 80, 0],
          y: [0, -60, 0],
          rotate: [0, 45, 0]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-15%] right-[-15%] w-[80%] aspect-square bg-teal/20 rounded-full blur-[120px] pointer-events-none" 
      />
      <motion.div 
        animate={{ 
          scale: [1.4, 1, 1.4],
          x: [0, -70, 0],
          y: [0, 80, 0],
          rotate: [0, -45, 0]
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[-15%] left-[-15%] w-[80%] aspect-square bg-violet/25 rounded-full blur-[120px] pointer-events-none" 
      />
      <motion.div 
        animate={{ opacity: [0.1, 0.4, 0.1] }}
        transition={{ duration: 12, repeat: Infinity }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] aspect-square bg-yellow/15 rounded-full blur-[160px] pointer-events-none" 
      />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[420px] bg-white/95 backdrop-blur-3xl rounded-[64px] shadow-lifted p-10 sm:p-12 flex flex-col items-center text-center relative z-10 border border-white"
      >
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, type: "spring", damping: 15 }}
          className="mb-8 relative"
        >
          {/* Logo image from user */}
          <div className="w-32 h-32 rounded-[40px] bg-navy flex items-center justify-center shadow-2xl relative overflow-hidden group">
            <img 
              src="/logo.png" 
              alt="SihatSapSapSui Logo" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                // Fallback if image doesn't exist yet - Make it look like a stylized placeholder
                e.currentTarget.style.display = 'none';
                const container = e.currentTarget.parentElement;
                if (container) {
                  container.innerHTML = `
                    <div class="flex flex-col items-center justify-center">
                      <div class="text-white font-black text-5xl tracking-tighter">SSS</div>
                      <div class="w-12 h-1 bg-teal mt-1 rounded-full"></div>
                    </div>
                  `;
                }
              }}
            />
            {/* Elegant Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-transparent pointer-events-none" />
          </div>
          
          <motion.div 
            animate={{ rotate: [0, 10, 0], scale: [1, 1.05, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-2 -right-2 w-10 h-10 bg-yellow rounded-2xl flex items-center justify-center shadow-lg border-4 border-white"
          >
            <Sparkles size={20} className="text-navy" />
          </motion.div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="w-full"
        >
          <div className="mb-10 text-center">
            <h1 className="text-[28px] sm:text-[34px] font-black tracking-tighter text-navy leading-none mb-5">
              Sihat<span className="text-teal">Sap</span><span className="text-violet">Sap</span><span className="text-amber">Sui</span>
            </h1>
            <div className="flex items-center justify-center gap-4">
              <div className="h-px w-10 bg-gradient-to-r from-transparent to-slate/20" />
              <p className="text-slate/60 text-[10px] font-bold uppercase tracking-[0.4em] whitespace-nowrap">Wellness App</p>
              <div className="h-px w-10 bg-gradient-to-l from-transparent to-slate/20" />
            </div>
          </div>
          
          <p className="text-slate text-[17px] font-medium mb-12 max-w-[280px] mx-auto leading-relaxed">
            Ready to find your <span className="text-navy font-bold">rhythm</span>? <br/>
            Let's get your health in sync.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="w-full space-y-4"
        >
          <Button 
            onClick={handleSignIn} 
            className="w-full h-18 text-lg rounded-[28px] shadow-lifted hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all bg-navy text-white font-bold flex items-center justify-center gap-4 group"
          >
            <div className="bg-white/10 p-1.5 rounded-xl group-hover:scale-110 transition-transform">
              <svg width="24" height="24" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </div>
            Sign in with Google
          </Button>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-12 pt-8 border-t border-slate/10 w-full"
        >
          <div className="flex items-center justify-center gap-8">
             <div className="flex flex-col items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-teal shadow-lg shadow-teal/20" />
                <span className="text-[9px] font-black text-slate/40 uppercase tracking-[0.2em]">Rest</span>
             </div>
             <div className="flex flex-col items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber shadow-lg shadow-amber/20" />
                <span className="text-[9px] font-black text-slate/40 uppercase tracking-[0.2em]">Eat</span>
             </div>
             <div className="flex flex-col items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-violet shadow-lg shadow-violet/20" />
                <span className="text-[9px] font-black text-slate/40 uppercase tracking-[0.2em]">Move</span>
             </div>
          </div>
        </motion.div>


      </motion.div>
    </div>
  );
}
