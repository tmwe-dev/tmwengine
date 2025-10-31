import React from 'react';
import { cn } from '@/lib/utils';

/**
 * GlassCard - Card con effetto glassmorphism
 */

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  blur?: 'sm' | 'md' | 'lg';
  gradient?: boolean;
  onClick?: () => void;
  title?: string;
  description?: string;
  headerAction?: React.ReactNode;
}

export function GlassCard({
  children,
  className,
  blur = 'md',
  gradient = false,
  onClick,
  title,
  description,
  headerAction
}: GlassCardProps) {
  const blurClasses = {
    sm: 'backdrop-blur-sm',
    md: 'backdrop-blur-md',
    lg: 'backdrop-blur-lg'
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white/10 border border-white/20 rounded-2xl',
        blurClasses[blur],
        gradient && 'bg-gradient-to-br from-white/20 to-white/5',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {(title || description || headerAction) && (
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div>
            {title && <h3 className="text-lg font-semibold">{title}</h3>}
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {headerAction}
        </div>
      )}
      <div className={title || description || headerAction ? 'p-4' : ''}>
        {children}
      </div>
    </div>
  );
}
