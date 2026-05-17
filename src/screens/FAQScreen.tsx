/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Layout } from '../components/Layout';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

export function FAQScreen() {
  const navigate = useNavigate();

  const faqs = [
    {
      q: "What are SIHAT Loops?",
      a: "SIHAT Loops are daily 24-hour cycles of Sleep, Eat, and Move activities. Our goal is to help you stay within a \"healthy loop\" and build lasting habits through small, daily wins."
    },
    {
      q: "How is my score calculated?",
      a: "Each category (Sleep, Eat, Move) is scored out of 100. Sleep is based on duration vs. target and mood. Eat is based on health ratings and nutrient balance. Move is based on intensity, duration, and weekly consistency."
    },
    {
      q: "What do \"Energy Costs\" mean?",
      a: "Energy costs help you track the effort required for meals and activities. Low Energy tasks are quick and easy, while High Energy tasks require significant time or physical effort. This helps AI suggest better timings for your loops."
    },
    {
      q: "Can I edit or delete past logs?",
      a: "Yes! You can view and delete entire days from the History screen. Individual logs can be updated by navigating to the respective Loop (Sleep/Eat/Move) section for that day."
    },
    {
      q: "Why are AI insights sometimes static?",
      a: "Insights refresh when you add new data. If you have nothing logged for the day, the AI will provide a general tip to get you started. Once you log your first activity, the insight will sharpen!"
    },
    {
      q: "Is my health data private?",
      a: "Completely. Your logs are stored securely and only used to generate your personalized AI insights within your private dashboard. Your data is never shared with third parties."
    },
    {
      q: "What if I miss a day?",
      a: "Don't worry! Health is a marathon. Your scores might dip slightly, but starting a new loop today is all that matters. Consistency is better than perfection."
    },
    {
      q: "How does the Weekly Insight work?",
      a: "Every week, our AI analyzes your consistency across all loops. It looks for patterns (like always skipping breakfast or sleeping late on weekends) and provides a strategic high-level plan for the next week."
    }
  ];

  return (
    <Layout>
      <header className="mb-8 flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-off-white flex items-center justify-center text-navy hover:bg-navy hover:text-white transition-all shadow-sm"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-[28px] font-black leading-tight text-navy">Help & FAQs</h1>
          <p className="text-slate font-medium">Find answers to common questions.</p>
        </div>
      </header>

      <div className="space-y-4 max-w-[500px] mx-auto pb-20">
        {faqs.map((faq, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <details className="group bg-white border border-off-white rounded-card overflow-hidden shadow-sm">
              <summary className="p-5 font-bold text-navy cursor-pointer list-none flex justify-between items-center group-open:bg-navy group-open:text-white transition-all">
                <span className="pr-4">{faq.q}</span>
                <ChevronRight size={18} className="shrink-0 transition-transform group-open:rotate-90 opacity-40 group-open:opacity-100" />
              </summary>
              <div className="p-5 text-sm text-slate font-medium leading-relaxed bg-off-white/30 border-t border-off-white">
                {faq.a}
              </div>
            </details>
          </motion.div>
        ))}
      </div>
    </Layout>
  );
}
