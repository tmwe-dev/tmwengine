import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * StatusBadge - Badge per indicare stati
 * 
 * @example
 * ```tsx
 * <StatusBadge status="success">Completato</StatusBadge>
 * <StatusBadge status="warning">In Attesa</StatusBadge>
 * <StatusBadge status="error">Errore</StatusBadge>
 * ```
 */

interface StatusBadgeProps {
  status: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

export function StatusBadge({ status, children, className, dot = false }: StatusBadgeProps) {
  const statusStyles = {
    success: 'bg-green-500/20 text-green-400 border-green-500/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    error: 'bg-red-500/20 text-red-400 border-red-500/30',
    info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    neutral: 'bg-muted text-muted-foreground border-border'
  };

  const dotColors = {
    success: 'bg-green-400',
    warning: 'bg-yellow-400',
    error: 'bg-red-400',
    info: 'bg-blue-400',
    neutral: 'bg-muted-foreground'
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        'border',
        statusStyles[status],
        className
      )}
    >
      {dot && (
        <span className={cn('h-2 w-2 rounded-full mr-2', dotColors[status])} />
      )}
      {children}
    </Badge>
  );
}
