import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * LoadingState - Stato di caricamento
 * 
 * @example
 * ```tsx
 * <LoadingState message="Caricamento dati..." />
 * ```
 */

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingState({ message, size = 'md', className }: LoadingStateProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-16 w-16'
  };

  return (
    <div className={cn('flex flex-col items-center justify-center py-12', className)}>
      <Loader2 className={cn('animate-spin text-primary mb-4', sizeClasses[size])} />
      {message && <p className="text-muted-foreground">{message}</p>}
    </div>
  );
}
