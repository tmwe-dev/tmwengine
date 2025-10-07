import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * CountBadge - Badge con contatore numerico
 * 
 * @example
 * ```tsx
 * <CountBadge count={42} variant="primary" />
 * <CountBadge count={5} variant="error" max={10} />
 * ```
 */

interface CountBadgeProps {
  count: number;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  max?: number;
  className?: string;
}

export function CountBadge({ count, variant = 'primary', max, className }: CountBadgeProps) {
  const variantStyles = {
    primary: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    secondary: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    success: 'bg-green-500/20 text-green-400 border-green-500/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    error: 'bg-red-500/20 text-red-400 border-red-500/30'
  };

  const displayCount = max && count > max ? `${max}+` : count;

  return (
    <Badge
      variant="outline"
      className={cn(
        'h-6 min-w-6 flex items-center justify-center px-2 font-bold text-xs border',
        variantStyles[variant],
        className
      )}
    >
      {displayCount}
    </Badge>
  );
}
