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
}

export function Card({ children, className, domain = 'none' }: CardProps) {
  const domainColors = {
    sleep: 'border-l-amber bg-amber/5',
    eat: 'border-l-teal bg-teal/5',
    move: 'border-l-violet bg-violet/5',
    none: 'border-l-transparent'
  };

  return (
    <div className={cn(
      "bg-white rounded-card shadow-ambient border-l-[5px] p-4 transition-all duration-300",
      domainColors[domain],
      className
    )}>
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
