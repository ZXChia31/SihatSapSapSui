/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from './UI';
import { Sparkles, Loader2, Info, ArrowRight, RotateCcw, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

import { User as Profile } from '../types';
import { trackAIUsage, savePatternAnalysis } from '../services/geminiService';
import { cn } from '../lib/utils';

interface AIPatternsProps {
  userId: string;
  domain: 'Sleep' | 'Eat' | 'Move';
  logs: unknown[];
  profile: Profile | null;
}

export function AIPatterns({ userId, domain, logs, profile }: AIPatternsProps) {
  const navigate = useNavigate();
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [error, setError] = useState(false);

  // Compute Fingerprint to check if analysis is stale
  const fingerprint = useMemo(() => {
    if (logs.length === 0) return '';
    const lastLogTime = (logs[0] as { loggedAt?: string; completedAt?: string }).loggedAt || 
                      (logs[0] as { loggedAt?: string; completedAt?: string }).completedAt || '';
    const today = new Date().toISOString().split('T')[0];
    return `${logs.length}_${lastLogTime}_${today}`;
  }, [logs]);

  const fetchInsight = useCallback(async (isForce: boolean = false) => {
    if (logs.length < 3) return;
    
    const domainKey = domain.toLowerCase();
    const existingAnalysis = profile?.aiAnalyses?.[domainKey];

    // 1. Check if we have a valid, up-to-date analysis in Firestore (cross-device sync)
    if (existingAnalysis) {
      setInsight(existingAnalysis.text);
      if (!isForce && existingAnalysis.fingerprint === fingerprint) {
        setError(false);
        setIsLimitReached(false);
        return;
      }
    }

    // 2. Check balance
    const balance = profile?.aiUsage?.balance ?? 100;
    if (balance <= 0) {
      setIsLimitReached(true);
      // Fallback to whatever we had in Firestore, even if fingerprint is different
      if (existingAnalysis) {
        setInsight(existingAnalysis.text);
      }
      return;
    }

    setLoading(true);
    setError(false);
    setIsLimitReached(false);

    try {
      const res = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ domain, logs, profile })
      });
      
      if (!res.ok) {
        if (res.status === 429) {
          setIsLimitReached(true);
        } else {
          setError(true);
        }
        
        // Fallback to last successful insight in Firestore on error/limit
        if (existingAnalysis) {
          setInsight(existingAnalysis.text);
        }
        return;
      }
      
      const data = await res.json();
      if (data.text) {
        setInsight(data.text);
        // Track usage and save to Firestore for cross-device sync
        await savePatternAnalysis(userId, domain, data.text, fingerprint);
        await trackAIUsage(userId);
      }
    } catch {
      setError(true);
      if (existingAnalysis) {
        setInsight(existingAnalysis.text);
      }
    } finally {
      setLoading(false);
    }
  }, [domain, logs, userId, profile, fingerprint]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInsight();
    }, 1500);
    return () => clearTimeout(timer);
  }, [fetchInsight]);

  if (loading) {
    return (
      <Card className="relative overflow-hidden border-2 border-navy/5 bg-white shadow-lg p-6 rounded-[32px] animate-pulse">
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-slate/10 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-slate/20" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="h-3 w-24 bg-slate/10 rounded" />
            <div className="h-2 w-32 bg-slate/5 rounded" />
          </div>
        </div>
        <div className="mt-6 space-y-2">
          <div className="h-2 w-full bg-slate/5 rounded" />
          <div className="h-2 w-4/5 bg-slate/5 rounded" />
        </div>
      </Card>
    );
  }

  if (logs.length < 3) {
    return (
      <Card className="relative overflow-hidden border-2 border-slate/10 bg-off-white/50 p-6 rounded-[32px] flex items-center gap-6 group">
        <div className="relative z-10 w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center border border-slate/10 shrink-0">
          <Info className="text-navy/10" size={24} />
        </div>
        
        <div className="relative z-10">
          <h3 className="font-black text-navy uppercase tracking-[0.2em] text-[9px] mb-1 opacity-40">Insight Standby</h3>
          <p className="text-navy/40 text-[11px] font-medium leading-tight">
            Log {3 - logs.length} more activities to unlock AI Analysis
          </p>
        </div>
      </Card>
    );
  }

  const handleOpenAnalysis = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    // Allow opening if we have an insight, even if checking for updates (loading)
    if (insight) {
      const domainKey = domain.toLowerCase();
      const existingDate = profile?.aiAnalyses?.[domainKey]?.updatedAt;
      
      console.log('Navigating to analysis for:', domain);
      navigate(`/analysis/${domain.toLowerCase()}`, { 
        state: { 
          insight,
          domain,
          logs,
          profile,
          date: existingDate || new Date().toISOString()
        } 
      });
    }
  };

  return (
    <Card 
      onClick={handleOpenAnalysis}
      className={cn(
        "relative overflow-hidden border-2 border-navy/5 bg-white shadow-lg p-6 rounded-[32px] group transition-all",
        !insight && !error && !isLimitReached && "opacity-80"
      )}
    >
      {/* Background Accent */}
      <div className={cn(
        "absolute -top-16 -right-16 w-48 h-48 rounded-full blur-[60px] opacity-[0.08] pointer-events-none transition-all duration-1000 group-hover:scale-150",
        domain === 'Sleep' ? "bg-amber" : domain === 'Eat' ? "bg-teal" : "bg-violet"
      )} />

      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner relative overflow-hidden transition-all duration-500",
            domain === 'Sleep' ? "bg-amber/10 text-amber" : domain === 'Eat' ? "bg-teal/10 text-teal" : "bg-violet/10 text-violet"
          )}>
            <Sparkles size={24} fill="currentColor" className="relative z-10" />
          </div>
          <div>
            <h3 className="font-black text-navy uppercase tracking-[0.2em] text-[11px] leading-tight mb-0.5">
              {domain} Analysis
            </h3>
            <div className="flex items-center gap-2">
              {insight ? (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-teal uppercase tracking-tighter bg-teal/5 px-2 py-0.5 rounded-md">Analysis Ready</span>
                  {loading ? (
                    <Loader2 size={10} className="animate-spin text-teal/40" />
                  ) : isLimitReached ? (
                    <span className="text-[9px] font-bold text-coral/60 uppercase">Limit Reached</span>
                  ) : error ? (
                    <span className="text-[9px] font-bold text-coral/60 uppercase">Sync Error</span>
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" />
                  )}
                </div>
              ) : isLimitReached ? (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-coral uppercase tracking-tighter bg-coral/5 px-2 py-0.5 rounded-md">AI Resting</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-coral animate-pulse" />
                </div>
              ) : error ? (
                <span className="text-[10px] font-bold text-coral uppercase">Sync Error</span>
              ) : (
                <span className="text-[10px] font-bold text-slate/40 uppercase">Initializing...</span>
              )}
            </div>
          </div>
        </div>

        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center transition-all",
          insight ? "bg-navy text-white shadow-lg shadow-navy/20" : "bg-off-white text-slate/20"
        )}>
          {isLimitReached && !insight ? (
            <button 
              onClick={(e) => { e.stopPropagation(); fetchInsight(true); }}
              className="w-full h-full flex items-center justify-center text-coral"
              title="Retry Analysis"
            >
              <RotateCcw size={18} />
            </button>
          ) : error ? (
            <button 
              onClick={(e) => { e.stopPropagation(); fetchInsight(true); }}
              className="w-full h-full flex items-center justify-center text-coral"
              title="Sync Error - Click to Retry"
            >
              <AlertCircle size={18} />
            </button>
          ) : (
            <ArrowRight size={20} className={cn(insight && "group-hover:translate-x-1 transition-transform")} />
          )}
        </div>
      </div>

      {insight && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 pt-4 border-t border-slate/5"
        >
          {isLimitReached && (
            <p className="text-[9px] font-black text-slate/40 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Info size={10} /> Showing latest cached analysis
            </p>
          )}
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-medium text-slate uppercase tracking-tight max-w-[180px] line-clamp-1 opacity-60">
              {insight.split('\n')[0].replace(/[#*]/g, '')}
            </p>
            <button 
              onClick={handleOpenAnalysis}
              className="text-[9px] font-black text-navy uppercase tracking-widest bg-off-white px-3 py-1 rounded-full hover:bg-navy hover:text-white transition-colors"
            >
              View Full Report
            </button>
          </div>
        </motion.div>
      )}

      {!insight && isLimitReached && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 pt-4 border-t border-slate/5 text-[12px] font-medium text-slate/60 leading-relaxed italic"
        >
          "AI usage hit its quota and let the AI rest for a while."
        </motion.div>
      )}
    </Card>
  );
}
