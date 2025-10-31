import React from 'react';
import { cn } from '@/lib/utils';
import { FadeIn } from '../animations/FadeIn';

/**
 * PageLayout - Layout base per pagine con header e contenuto
 * 
 * @example
 * ```tsx
 * <PageLayout
 *   title="Titolo Pagina"
 *   description="Descrizione"
 *   actions={<Button>Azione</Button>}
 * >
 *   Contenuto pagina
 * </PageLayout>
 * ```
 */

interface PageLayoutProps {
  title?: React.ReactNode;
  description?: string;
  actions?: React.ReactNode;
  headerUtilities?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  gradient?: boolean;
  animate?: boolean;
}

export function PageLayout({
  title,
  description,
  actions,
  headerUtilities,
  children,
  className,
  headerClassName,
  contentClassName,
  gradient = false,
  animate = true
}: PageLayoutProps) {
  const content = (
    <div className={cn('min-h-screen w-full', className)}>
      <div className={cn('container py-6', contentClassName)}>
        {children}
      </div>
    </div>
  );

  if (animate) {
    return <FadeIn duration={0.3}>{content}</FadeIn>;
  }

  return content;
}
