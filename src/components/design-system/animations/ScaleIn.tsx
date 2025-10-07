import React from 'react';
import { cn } from '@/lib/utils';

/**
 * ScaleIn - Componente per animazione scale-in
 * 
 * @example
 * ```tsx
 * <ScaleIn>
 *   <div>Contenuto che si ingrandisce</div>
 * </ScaleIn>
 * ```
 */

interface ScaleInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  scale?: number;
}

export function ScaleIn({
  children,
  className,
  delay = 0,
  duration = 0.3,
  scale = 0.95
}: ScaleInProps) {
  return (
    <div
      className={cn(
        'animate-scale-in opacity-0',
        className
      )}
      style={{
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
        animationFillMode: 'forwards',
        '--scale-from': scale
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
