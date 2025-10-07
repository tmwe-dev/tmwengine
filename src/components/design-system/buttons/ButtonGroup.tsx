import React from 'react';
import { cn } from '@/lib/utils';

/**
 * ButtonGroup - Gruppo di bottoni allineati
 * 
 * @example
 * ```tsx
 * <ButtonGroup>
 *   <Button>Primo</Button>
 *   <Button>Secondo</Button>
 *   <Button>Terzo</Button>
 * </ButtonGroup>
 * ```
 */

interface ButtonGroupProps {
  children: React.ReactNode;
  orientation?: 'horizontal' | 'vertical';
  spacing?: 'tight' | 'normal' | 'loose';
  align?: 'start' | 'center' | 'end';
  className?: string;
}

export function ButtonGroup({
  children,
  orientation = 'horizontal',
  spacing = 'normal',
  align = 'start',
  className
}: ButtonGroupProps) {
  const spacingClasses = {
    tight: 'gap-1',
    normal: 'gap-2',
    loose: 'gap-4'
  };

  const alignClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end'
  };

  return (
    <div
      className={cn(
        'flex',
        orientation === 'horizontal' ? 'flex-row items-center' : 'flex-col items-stretch',
        spacingClasses[spacing],
        alignClasses[align],
        className
      )}
    >
      {children}
    </div>
  );
}
