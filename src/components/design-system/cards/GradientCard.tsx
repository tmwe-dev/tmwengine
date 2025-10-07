import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * GradientCard - Card con gradiente di sfondo
 * 
 * @example
 * ```tsx
 * <GradientCard variant="primary" title="Titolo">
 *   Contenuto
 * </GradientCard>
 * ```
 */

interface GradientCardProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'destructive';
  intensity?: 'light' | 'medium' | 'strong';
}

export function GradientCard({
  title,
  description,
  children,
  className,
  variant = 'primary',
  intensity = 'medium'
}: GradientCardProps) {
  const variants = {
    primary: {
      light: 'bg-gradient-to-bl from-purple-400/15 via-purple-400/10 to-transparent',
      medium: 'bg-gradient-to-bl from-purple-400/25 via-purple-400/15 to-transparent',
      strong: 'bg-gradient-to-bl from-purple-400/35 via-purple-400/25 to-transparent'
    },
    secondary: {
      light: 'bg-gradient-to-bl from-blue-400/15 via-blue-400/10 to-transparent',
      medium: 'bg-gradient-to-bl from-blue-400/25 via-blue-400/15 to-transparent',
      strong: 'bg-gradient-to-bl from-blue-400/35 via-blue-400/25 to-transparent'
    },
    success: {
      light: 'bg-gradient-to-bl from-green-400/15 via-green-400/10 to-transparent',
      medium: 'bg-gradient-to-bl from-green-400/25 via-green-400/15 to-transparent',
      strong: 'bg-gradient-to-bl from-green-400/35 via-green-400/25 to-transparent'
    },
    warning: {
      light: 'bg-gradient-to-bl from-yellow-400/15 via-yellow-400/10 to-transparent',
      medium: 'bg-gradient-to-bl from-yellow-400/25 via-yellow-400/15 to-transparent',
      strong: 'bg-gradient-to-bl from-yellow-400/35 via-yellow-400/25 to-transparent'
    },
    destructive: {
      light: 'bg-gradient-to-bl from-red-400/15 via-red-400/10 to-transparent',
      medium: 'bg-gradient-to-bl from-red-400/25 via-red-400/15 to-transparent',
      strong: 'bg-gradient-to-bl from-red-400/35 via-red-400/25 to-transparent'
    }
  };

  return (
    <Card
      className={cn(
        'border border-white/10',
        variants[variant][intensity],
        className
      )}
    >
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>{children}</CardContent>
    </Card>
  );
}
