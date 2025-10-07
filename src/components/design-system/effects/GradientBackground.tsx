import React from 'react';
import { cn } from '@/lib/utils';

/**
 * GradientBackground - Sfondo con gradiente animato
 * 
 * @example
 * ```tsx
 * <GradientBackground variant="primary" animated>
 *   <div>Contenuto con sfondo gradiente</div>
 * </GradientBackground>
 * ```
 */

interface GradientBackgroundProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'multi';
  intensity?: 'subtle' | 'medium' | 'strong';
  animated?: boolean;
  direction?: 'tl' | 'tr' | 'br' | 'bl';
}

export function GradientBackground({
  children,
  className,
  variant = 'primary',
  intensity = 'medium',
  animated = false,
  direction = 'br'
}: GradientBackgroundProps) {
  const directions = {
    tl: 'bg-gradient-to-tl',
    tr: 'bg-gradient-to-tr',
    br: 'bg-gradient-to-br',
    bl: 'bg-gradient-to-bl'
  };

  const variants = {
    primary: {
      subtle: 'from-purple-500/10 via-background to-background',
      medium: 'from-purple-500/20 via-purple-500/10 to-background',
      strong: 'from-purple-500/30 via-purple-500/15 to-background'
    },
    secondary: {
      subtle: 'from-blue-500/10 via-background to-background',
      medium: 'from-blue-500/20 via-blue-500/10 to-background',
      strong: 'from-blue-500/30 via-blue-500/15 to-background'
    },
    success: {
      subtle: 'from-green-500/10 via-background to-background',
      medium: 'from-green-500/20 via-green-500/10 to-background',
      strong: 'from-green-500/30 via-green-500/15 to-background'
    },
    warning: {
      subtle: 'from-yellow-500/10 via-background to-background',
      medium: 'from-yellow-500/20 via-yellow-500/10 to-background',
      strong: 'from-yellow-500/30 via-yellow-500/15 to-background'
    },
    multi: {
      subtle: 'from-purple-500/10 via-blue-500/10 to-background',
      medium: 'from-purple-500/20 via-blue-500/15 to-background',
      strong: 'from-purple-500/30 via-blue-500/20 to-background'
    }
  };

  return (
    <div
      className={cn(
        'relative',
        directions[direction],
        variants[variant][intensity],
        animated && 'animate-gradient bg-[length:200%_200%]',
        className
      )}
    >
      {children}
    </div>
  );
}
