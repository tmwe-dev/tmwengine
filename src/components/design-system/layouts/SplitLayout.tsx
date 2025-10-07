import React from 'react';
import { cn } from '@/lib/utils';

/**
 * SplitLayout - Layout a due colonne con divisione configurabile
 * 
 * @example
 * ```tsx
 * <SplitLayout
 *   left={<div>Sidebar</div>}
 *   right={<div>Contenuto principale</div>}
 *   ratio="1/3"
 * />
 * ```
 */

interface SplitLayoutProps {
  left: React.ReactNode;
  right: React.ReactNode;
  ratio?: '1/2' | '1/3' | '2/3' | '1/4';
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
  reverse?: boolean;
  verticalOnMobile?: boolean;
}

export function SplitLayout({
  left,
  right,
  ratio = '1/3',
  gap = 'md',
  className,
  reverse = false,
  verticalOnMobile = true
}: SplitLayoutProps) {
  const ratios = {
    '1/2': 'lg:grid-cols-2',
    '1/3': 'lg:grid-cols-[1fr_2fr]',
    '2/3': 'lg:grid-cols-[2fr_1fr]',
    '1/4': 'lg:grid-cols-[1fr_3fr]'
  };

  const gaps = {
    sm: 'gap-4',
    md: 'gap-6',
    lg: 'gap-8'
  };

  return (
    <div
      className={cn(
        'grid',
        verticalOnMobile ? 'grid-cols-1' : 'grid-cols-2',
        ratios[ratio],
        gaps[gap],
        className
      )}
    >
      {reverse ? (
        <>
          <div className="order-2 lg:order-1">{right}</div>
          <div className="order-1 lg:order-2">{left}</div>
        </>
      ) : (
        <>
          <div>{left}</div>
          <div>{right}</div>
        </>
      )}
    </div>
  );
}
