import React from 'react';
import { cn } from '@/lib/utils';

/**
 * ContentWrapper - Wrapper per contenuti con spaziature consistenti
 * 
 * @example
 * ```tsx
 * <ContentWrapper maxWidth="lg" spacing="lg">
 *   Contenuto
 * </ContentWrapper>
 * ```
 */

interface ContentWrapperProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  spacing?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  centered?: boolean;
  gradient?: boolean;
}

export function ContentWrapper({
  children,
  className,
  maxWidth = 'xl',
  spacing = 'md',
  centered = false,
  gradient = false
}: ContentWrapperProps) {
  const maxWidths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full'
  };

  const spacings = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-12'
  };

  return (
    <div
      className={cn(
        'w-full',
        maxWidths[maxWidth],
        spacings[spacing],
        centered && 'mx-auto',
        gradient && 'bg-gradient-to-br from-background via-background to-muted/10 rounded-lg border',
        className
      )}
    >
      {children}
    </div>
  );
}
