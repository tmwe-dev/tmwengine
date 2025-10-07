import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * GlassCard - Card con effetto glassmorphism
 * 
 * @example
 * ```tsx
 * <GlassCard title="Titolo" description="Descrizione">
 *   Contenuto
 * </GlassCard>
 * ```
 */

interface GlassCardProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
  blur?: 'sm' | 'md' | 'lg';
  gradient?: boolean;
}

export function GlassCard({
  title,
  description,
  children,
  className,
  headerAction,
  blur = 'md',
  gradient = false
}: GlassCardProps) {
  const blurClasses = {
    sm: 'backdrop-blur-sm',
    md: 'backdrop-blur-md',
    lg: 'backdrop-blur-lg'
  };

  return (
    <Card
      className={cn(
        'border border-white/10 bg-background/40',
        blurClasses[blur],
        gradient && 'bg-gradient-to-br from-background/60 via-background/40 to-background/20',
        className
      )}
    >
      {(title || description || headerAction) && (
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            {title && <CardTitle>{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {headerAction}
        </CardHeader>
      )}
      <CardContent>{children}</CardContent>
    </Card>
  );
}
