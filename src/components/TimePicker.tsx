/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChevronUp, ChevronDown } from 'lucide-react';

interface TimePickerProps {
  value: string; // HH:MM
  onChange: (value: string) => void;
}

export function TimePicker({ value, onChange }: TimePickerProps) {
  const parts = value.split(':').map(Number);
  const hours = parts[0] || 0;
  const minutes = parts[1] || 0;

  const updateTime = (h: number, m: number) => {
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    onChange(`${hh}:${mm}`);
  };

  const adjustHour = (delta: number) => {
    let next = hours + delta;
    if (next > 23) next = 0;
    if (next < 0) next = 23;
    updateTime(next, minutes);
  };

  const adjustMinute = (delta: number) => {
    let next = minutes + delta;
    if (next > 59) next = 0;
    if (next < 0) next = 59;
    updateTime(hours, next);
  };

  return (
    <div className="flex items-center justify-center gap-4 bg-off-white/50 p-4 rounded-3xl border border-off-white">
      {/* Hours */}
      <div className="flex flex-col items-center gap-2">
        <button 
          type="button"
          onClick={() => adjustHour(1)}
          className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-navy"
        >
          <ChevronUp size={24} />
        </button>
        <div className="text-4xl font-black text-navy w-16 text-center tabular-nums">
          {String(hours).padStart(2, '0')}
        </div>
        <button 
          type="button"
          onClick={() => adjustHour(-1)}
          className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-navy"
        >
          <ChevronDown size={24} />
        </button>
      </div>

      <div className="text-4xl font-black text-navy pb-2 animate-pulse">:</div>

      {/* Minutes */}
      <div className="flex flex-col items-center gap-2">
        <button 
          type="button"
          onClick={() => adjustMinute(5)}
          className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-navy"
        >
          <ChevronUp size={24} />
        </button>
        <div className="text-4xl font-black text-navy w-16 text-center tabular-nums">
          {String(minutes).padStart(2, '0')}
        </div>
        <button 
          type="button"
          onClick={() => adjustMinute(-5)}
          className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-navy"
        >
          <ChevronDown size={24} />
        </button>
      </div>
    </div>
  );
}
