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
  glossy?: boolean;
  onClick?: () => void;
  title?: string;
  description?: string;
  headerAction?: React.ReactNode;
  style?: React.CSSProperties;
}

export function GlassCard({
  children,
  className,
  blur = 'md',
  gradient = false,
  glossy = false,
  onClick,
  title,
  description,
  headerAction,
  style
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
        'rounded-2xl border border-white/20',
        onClick && 'cursor-pointer',
        className
      )}
      style={{
        ...style,
        background: 'linear-gradient(to right, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.4) 20%, transparent 40%)'
      }}
    >
      {(title || description || headerAction) && (
        <div className="flex items-center justify-between p-4 border-b border-white/10 relative z-10">
          <div>
            {title && <h3 className="text-lg font-semibold">{title}</h3>}
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {headerAction}
        </div>
      )}
      <div className={cn(
        title || description || headerAction ? 'p-4' : '',
        'relative z-10'
      )}>
        {children}
      </div>
    </div>
  );
}
