import React from 'react';
import { cn } from '@/lib/utils';

/**
 * GradientText - Testo con gradiente di colore
 * 
 * @example
 * ```tsx
 * <GradientText variant="primary" size="xl">
 *   Testo con gradiente
 * </GradientText>
 * ```
 */

interface GradientTextProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'success' | 'rainbow';
  size?: 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
  animated?: boolean;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span';
}

export function GradientText({
  children,
  className,
  variant = 'primary',
  size = 'base',
  animated = false,
  as: Component = 'span'
}: GradientTextProps) {
  const variants = {
    primary: 'from-purple-400 via-purple-300 to-blue-400',
    secondary: 'from-blue-400 via-cyan-300 to-teal-400',
    success: 'from-green-400 via-emerald-300 to-teal-400',
    rainbow: 'from-purple-400 via-pink-400 to-red-400'
  };

  const sizes = {
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
    '3xl': 'text-3xl'
  };

  return (
    <Component
      className={cn(
        'bg-gradient-to-r bg-clip-text text-transparent font-bold',
        variants[variant],
        sizes[size],
        animated && 'animate-gradient bg-[length:200%_200%]',
        className
      )}
    >
      {children}
    </Component>
  );
}
