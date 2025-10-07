import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

/**
 * LoadingOverlay - Overlay di caricamento con spinner
 * 
 * @example
 * ```tsx
 * <LoadingOverlay visible={loading} message="Caricamento..." />
 * ```
 */

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  fullScreen?: boolean;
  className?: string;
}

export function LoadingOverlay({
  visible,
  message,
  fullScreen = false,
  className
}: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <div
      className={cn(
        'absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm',
        fullScreen && 'fixed',
        className
      )}
    >
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        {message && (
          <p className="text-sm font-medium text-muted-foreground">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
