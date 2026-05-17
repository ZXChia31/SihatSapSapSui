/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReactNode } from 'react';
import { cn } from '../lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  domain?: 'sleep' | 'eat' | 'move' | 'none';
  onClick?: (e: React.MouseEvent) => void;
}

export function Card({ children, className, domain = 'none', onClick }: CardProps) {
  const domainColors = {
    sleep: 'border-l-amber bg-amber/5',
    eat: 'border-l-teal bg-teal/5',
    move: 'border-l-violet bg-violet/5',
    none: 'border-l-transparent'
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "bg-white rounded-card shadow-ambient border-l-[5px] p-4 transition-all duration-300",
        domainColors[domain],
        onClick && "cursor-pointer active:scale-[0.98]",
        className
      )}
    >
      {children}
    </div>
  );
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  domain?: 'sleep' | 'eat' | 'move' | 'none';
  fullWidth?: boolean;
}

export function Button({ 
  children, 
  className, 
  variant = 'primary', 
  domain = 'none',
  fullWidth = true,
  ...props 
}: ButtonProps) {
  const variants = {
    primary: 'bg-navy text-white shadow-sm active:scale-[0.98]',
    secondary: 'bg-yellow text-navy shadow-sm active:scale-[0.98]',
    ghost: 'bg-transparent border-[1.5px] border-navy text-navy',
    destructive: 'bg-coral text-white shadow-sm'
  };

  const domainPrimaryColors = {
    sleep: 'bg-amber text-white',
    eat: 'bg-teal text-white',
    move: 'bg-violet text-white',
    none: ''
  };

  const domainGhostColors = {
    sleep: 'border-amber text-amber',
    eat: 'border-teal text-teal',
    move: 'border-violet text-violet',
    none: ''
  };

  const baseStyle = "h-[56px] rounded-radius-button font-bold text-[17px] flex items-center justify-center transition-all duration-200";
  
  const finalStyle = cn(
    baseStyle,
    fullWidth ? "w-full" : "px-8",
    variant === 'primary' && domain !== 'none' ? domainPrimaryColors[domain] : variants[variant],
    variant === 'ghost' && domain !== 'none' ? domainGhostColors[domain] : '',
    props.disabled && "opacity-50 cursor-not-allowed",
    className
  );

  return (
    <button className={finalStyle} {...props}>
      {children}
    </button>
  );
}

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export function ConfirmModal({ isOpen, onClose, onConfirm, title, message }: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-navy/60 backdrop-blur-sm z-[100] flex items-center justify-center p-5">
      <div className="bg-white w-full max-w-[340px] rounded-[24px] p-6 shadow-2xl flex flex-col gap-6 font-sans">
        <div className="text-center">
          <h3 className="text-xl font-black text-navy mb-2">{title}</h3>
          <p className="text-slate font-medium text-sm leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onClose} className="h-12 text-sm">Cancel</Button>
          <Button variant="destructive" onClick={() => { onConfirm(); onClose(); }} className="h-12 text-sm">Delete</Button>
        </div>
      </div>
    </div>
  );
}
