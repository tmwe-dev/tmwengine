import React from 'react';
import { cn } from '@/lib/utils';

/**
 * HoverCard - Card con effetti hover avanzati
 * 
 * @example
 * ```tsx
 * <HoverCard effect="lift">
 *   Contenuto con effetto hover
 * </HoverCard>
 * ```
 */

interface HoverCardProps {
  children: React.ReactNode;
  className?: string;
  effect?: 'lift' | 'glow' | 'tilt' | 'scale';
  gradient?: boolean;
}

export function HoverCard({
  children,
  className,
  effect = 'lift',
  gradient = false
}: HoverCardProps) {
  const effects = {
    lift: 'hover:shadow-lg hover:-translate-y-1',
    glow: 'hover:shadow-[0_0_30px_rgba(168,85,247,0.4)]',
    tilt: 'hover:rotate-1 hover:scale-105',
    scale: 'hover:scale-105'
  };

  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-6 transition-all duration-300',
        effects[effect],
        gradient && 'bg-gradient-to-br from-card via-card to-muted/20',
        className
      )}
    >
      {children}
    </div>
  );
}
