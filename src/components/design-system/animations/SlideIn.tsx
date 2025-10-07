import React from 'react';
import { cn } from '@/lib/utils';

/**
 * SlideIn - Componente per animazione slide-in
 * 
 * @example
 * ```tsx
 * <SlideIn direction="right">
 *   <div>Contenuto che scorre</div>
 * </SlideIn>
 * ```
 */

interface SlideInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: 'left' | 'right' | 'up' | 'down';
}

export function SlideIn({
  children,
  className,
  delay = 0,
  duration = 0.5,
  direction = 'right'
}: SlideInProps) {
  const directions = {
    right: 'animate-slide-in-right',
    left: '-translate-x-full',
    up: 'translate-y-full',
    down: '-translate-y-full'
  };

  return (
    <div
      className={cn(
        'transition-transform',
        directions[direction],
        className
      )}
      style={{
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`
      }}
    >
      {children}
    </div>
  );
}
