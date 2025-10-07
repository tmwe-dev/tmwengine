import React from 'react';
import { cn } from '@/lib/utils';

/**
 * AnimatedBorder - Card con bordo animato
 * 
 * @example
 * ```tsx
 * <AnimatedBorder variant="primary">
 *   <div>Contenuto con bordo animato</div>
 * </AnimatedBorder>
 * ```
 */

interface AnimatedBorderProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'rainbow' | 'glow';
  speed?: 'slow' | 'normal' | 'fast';
}

export function AnimatedBorder({
  children,
  className,
  variant = 'primary',
  speed = 'normal'
}: AnimatedBorderProps) {
  const speeds = {
    slow: 'animate-[spin_4s_linear_infinite]',
    normal: 'animate-[spin_2s_linear_infinite]',
    fast: 'animate-[spin_1s_linear_infinite]'
  };

  const variants = {
    primary: 'bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500',
    rainbow: 'bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500',
    glow: 'bg-gradient-to-r from-purple-500/50 via-pink-500/50 to-purple-500/50'
  };

  return (
    <div className="relative inline-block">
      <div
        className={cn(
          'absolute inset-0 rounded-lg opacity-75 blur-sm',
          variants[variant],
          speeds[speed]
        )}
      />
      <div className={cn('relative rounded-lg bg-background p-[2px]', className)}>
        <div className="relative rounded-lg bg-background p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
