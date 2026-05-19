/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Card } from '../components/UI';
import { Sparkles, ArrowLeft, Share2, Calendar, ThumbsUp, ThumbsDown, CheckCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useEffect, useState } from 'react';
import { User, SleepLog } from '../types';

export function AnalysisDetailScreen() {
  const { domain: domainParam } = useParams<{ domain: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const insight = location.state?.insight as string;
  const analysisDate = location.state?.date || new Date().toISOString();
  const domain = (location.state?.domain as string) || domainParam || 'Analysis';

  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [showThanks, setShowThanks] = useState(false);

  const logs = (location.state?.logs || []) as SleepLog[];
  const profile = location.state?.profile as User | undefined;
  const isSleep = domain.toLowerCase() === 'sleep';
  const isEat = domain.toLowerCase() === 'eat';

  const timeToMinutes = (time: string) => {
    if (!time) return 0;
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const getSleepTimingInconsistencies = () => {
    if (!isSleep || !logs.length || !profile?.sleepTargetBedtime) return [];
    
    const inconsistencies = [];
    const targetBed = timeToMinutes(profile.sleepTargetBedtime);
    const targetWake = timeToMinutes(profile.sleepTargetWakeTime);
    
    // Use last 7 logs
    const recentLogs = [...logs]
      .filter((l) => l.bedtime && l.wakeTime)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 7);

    for (const log of recentLogs) {
      const bed = timeToMinutes(log.bedtime);
      const wake = timeToMinutes(log.wakeTime);
      
      const bedDiff = Math.abs(bed - targetBed);
      const wakeDiff = Math.abs(wake - targetWake);
      
      const normBedDiff = Math.min(bedDiff, 1440 - bedDiff);
      const normWakeDiff = Math.min(wakeDiff, 1440 - wakeDiff);

      if (normBedDiff > 60 || normWakeDiff > 60) {
        inconsistencies.push({
          date: log.date,
          bedDiff: normBedDiff,
          wakeDiff: normWakeDiff,
          bedtime: log.bedtime,
          wakeTime: log.wakeTime,
          isBedLate: bed > targetBed && bed - targetBed < 720,
        });
      }
    }
    return inconsistencies;
  };

  const sleepIssues = getSleepTimingInconsistencies();

  const handleFeedback = (type: 'up' | 'down') => {
    setFeedback(type);
    setShowThanks(true);
    setTimeout(() => setShowThanks(false), 3000);
  };

  const handleShare = async () => {
    const shareData = {
      title: `Sihat AI ${domain} Analysis`,
      text: `My AI-powered ${domain} loops insight:\n\n${insight.substring(0, 120)}...`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text}\n\nRead more at: ${shareData.url}`);
        alert('Analysis copied to clipboard!');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!insight) {
    return (
      <div className="min-h-screen bg-off-white flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-3xl bg-white shadow-xl flex items-center justify-center text-slate/20 mb-6">
           <Sparkles size={32} />
        </div>
        <p className="text-slate font-black uppercase tracking-widest text-[10px] mb-6">Simulation data missing</p>
        <button 
          onClick={() => navigate('/')}
          className="bg-navy text-white px-8 py-4 rounded-full font-black uppercase text-[11px] tracking-widest shadow-2xl shadow-navy/20 active:scale-95 transition-all"
        >
          Return to Loop
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-off-white pb-32">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-off-white/80 backdrop-blur-xl border-b border-slate/5 px-6 py-4">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-navy hover:scale-105 active:scale-90 transition-all border border-slate/5"
          >
            <ArrowLeft size={20} />
          </button>
          
          <div className="text-center">
            <h1 className="font-black text-navy uppercase tracking-[0.2em] text-[12px] mb-0.5">Focus: {domain}</h1>
            <div className="flex items-center justify-center gap-1.5">
               <div className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" />
               <span className="text-[9px] font-black text-slate uppercase tracking-widest opacity-40">Loop Intelligence V3.5</span>
            </div>
          </div>

          <button 
            onClick={handleShare}
            className="w-10 h-10 rounded-full bg-navy text-white shadow-lg flex items-center justify-center hover:bg-teal transition-all active:scale-95"
          >
            <Share2 size={18} />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 pt-8">
        <motion.div
           initial={{ opacity: 0, scale: 0.98 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ duration: 0.4 }}
        >
          {/* Main Analysis Card */}
          <Card className="p-8 sm:p-12 rounded-[48px] border-none shadow-2xl shadow-navy/5 bg-white relative overflow-hidden min-h-[500px]">
            {/* Background Accent */}
            <div className={cn(
              "absolute -top-32 -right-32 w-96 h-96 rounded-full blur-[120px] opacity-10 pointer-events-none animate-pulse",
              isSleep ? "bg-amber" : isEat ? "bg-teal" : "bg-violet"
            )} />

            <div className="flex items-center gap-5 mb-12">
               <div className={cn(
                 "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform hover:rotate-3",
                 isSleep ? "bg-amber/10 text-amber shadow-amber/20" : isEat ? "bg-teal/10 text-teal shadow-teal/20" : "bg-violet/10 text-violet shadow-violet/20"
               )}>
                 <Sparkles size={28} fill="currentColor" />
               </div>
               <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar size={14} className="text-slate/60" />
                    <span className="text-[11px] font-black text-slate/40 uppercase tracking-widest">
                      Analysis for {new Date(analysisDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <h2 className="font-black text-navy uppercase tracking-tighter text-2xl leading-none">Sihat Adaptive Engine</h2>
               </div>
            </div>

            <div className="prose prose-slate max-w-none 
              prose-p:text-[18px] prose-p:leading-[1.8] prose-p:font-medium prose-p:text-navy/90 prose-p:mb-6
              prose-headings:text-navy prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight prose-headings:mt-12 prose-headings:mb-8
              prose-h1:text-4xl prose-h2:text-2xl prose-h3:text-xl
              prose-strong:text-navy prose-strong:font-black prose-strong:bg-yellow/10 prose-strong:px-1 prose-strong:rounded
              prose-li:text-[17px] prose-li:font-medium prose-li:my-4 prose-li:leading-relaxed
              prose-ul:my-10 prose-ul:list-disc prose-ul:pl-6
              prose-blockquote:border-l-4 prose-blockquote:border-teal/30 prose-blockquote:bg-teal/5 prose-blockquote:p-6 prose-blockquote:rounded-r-2xl prose-blockquote:italic
              prose-code:bg-navy/5 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-navy prose-code:font-bold prose-code:before:content-none prose-code:after:content-none">
              
              {isSleep && sleepIssues.length > 0 && (
                <div className="mb-12 p-6 bg-amber/5 rounded-[32px] border border-amber/10">
                   <h3 className="text-amber font-black uppercase tracking-widest text-[11px] mb-4 flex items-center gap-2">
                     <Calendar size={14} /> Schedule Drift Detected
                   </h3>
                   <div className="space-y-3">
                     {sleepIssues.map((issue, idx) => (
                       <div key={idx} className="flex items-center justify-between bg-white/50 p-4 rounded-2xl border border-slate/5">
                         <div>
                            <span className="text-[10px] font-black text-slate/40 uppercase block mb-1">{new Date(issue.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                            <span className="text-[14px] font-bold text-navy">{issue.bedtime} - {issue.wakeTime}</span>
                         </div>
                         <div className="text-right">
                            <span className={cn(
                              "text-[10px] font-black px-2 py-1 rounded-md uppercase whitespace-nowrap",
                              issue.bedDiff > 60 ? "bg-coral/10 text-coral" : "bg-teal/10 text-teal"
                            )}>
                              {Math.round(issue.bedDiff / 60)}h {issue.bedDiff % 60}m drift
                            </span>
                         </div>
                       </div>
                     ))}
                   </div>
                   
                   <div className="mt-6 p-5 bg-amber/10 rounded-2xl border border-amber/20">
                      <h4 className="text-[12px] font-black text-amber uppercase mb-2">Normalization Tip</h4>
                      <p className="text-[14px] font-medium text-navy/80 m-0 leading-relaxed">
                        Your sleep timing drifted more than 1 hour from your target on {sleepIssues.length} days this week. 
                        To normalize, aim for a **"Sunlock"** tomorrow morning: 10 mins of natural light within 30 mins of waking to reset your circadian clock.
                      </p>
                   </div>
                </div>
              )}

              <div className="markdown-body">
                <ReactMarkdown>{insight}</ReactMarkdown>
              </div>
            </div>

            <div className="mt-16 pt-10 border-t border-off-white min-h-[140px] flex flex-col items-center justify-center">
               <AnimatePresence mode="wait">
                  {!showThanks ? (
                    <motion.div 
                      key="feedback-question"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex flex-col items-center text-center"
                    >
                       <h4 className="text-[11px] font-black text-navy uppercase tracking-widest mb-6">Was this insight helpful?</h4>
                       <div className="flex gap-4">
                          <button 
                            onClick={() => handleFeedback('up')}
                            className={cn(
                              "w-14 h-14 rounded-2xl flex items-center justify-center transition-all active:scale-90",
                              feedback === 'up' ? "bg-teal text-white shadow-lg shadow-teal/20" : "bg-off-white text-slate hover:bg-teal/10 hover:text-teal"
                            )}
                          >
                            <ThumbsUp size={24} fill={feedback === 'up' ? "currentColor" : "none"} />
                          </button>
                          <button 
                            onClick={() => handleFeedback('down')}
                            className={cn(
                              "w-14 h-14 rounded-2xl flex items-center justify-center transition-all active:scale-90",
                              feedback === 'down' ? "bg-red-500 text-white shadow-lg shadow-red-500/20" : "bg-off-white text-slate hover:bg-red-500/10 hover:text-red-500"
                            )}
                          >
                            <ThumbsDown size={24} fill={feedback === 'down' ? "currentColor" : "none"} />
                          </button>
                       </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="feedback-thanks"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.1 }}
                      className="flex items-center gap-3 text-teal font-black uppercase text-[12px] tracking-widest whitespace-nowrap bg-teal/5 border border-teal/10 px-8 py-4 rounded-full shadow-sm"
                    >
                       <CheckCircle size={18} /> 
                       <span>Thank you for the feedback!</span>
                    </motion.div>
                  )}
               </AnimatePresence>
            </div>

            <div className="mt-12 pt-8 border-t border-off-white flex flex-col items-center text-center">
              <div className="w-12 h-1 bg-off-white rounded-full mb-6" />
              <p className="text-[11px] font-bold text-slate/40 uppercase tracking-[0.2em] max-w-[240px]">
                These insights are generated based on your recent activity logs.
              </p>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Action Bar */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-xs px-6">
        <button 
          onClick={() => navigate(-1)}
          className="w-full bg-navy text-white font-black uppercase py-4 rounded-full shadow-2xl shadow-navy/40 hover:bg-teal transition-all active:scale-95 flex items-center justify-center gap-3 group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to Your Loop
        </button>
      </div>
    </div>
  );
}
