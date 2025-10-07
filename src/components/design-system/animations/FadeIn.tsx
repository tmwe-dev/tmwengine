import React from 'react';
import { cn } from '@/lib/utils';

/**
 * FadeIn - Componente per animazione fade-in
 * 
 * @example
 * ```tsx
 * <FadeIn delay={0.2}>
 *   <div>Contenuto che appare con fade</div>
 * </FadeIn>
 * ```
 */

interface FadeInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
}

export function FadeIn({
  children,
  className,
  delay = 0,
  duration = 0.5,
  direction = 'up'
}: FadeInProps) {
  const directions = {
    up: 'translate-y-4',
    down: '-translate-y-4',
    left: 'translate-x-4',
    right: '-translate-x-4',
    none: ''
  };

  return (
    <div
      className={cn(
        'animate-fade-in opacity-0',
        directions[direction],
        className
      )}
      style={{
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
        animationFillMode: 'forwards'
      }}
    >
      {children}
    </div>
  );
}
