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
      style={style}
      className={cn(
        'bg-white/8 border border-white/25 rounded-2xl shadow-inner backdrop-saturate-150',
        blurClasses[blur],
        gradient && 'bg-gradient-to-br from-white/20 to-white/5',
        glossy && 'relative overflow-hidden',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {glossy && (
        <div 
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.5) 0%, transparent 50%)',
            mixBlendMode: 'screen',
          }}
        />
      )}
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
