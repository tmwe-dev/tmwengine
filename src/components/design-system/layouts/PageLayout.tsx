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
  backButton?: React.ReactNode;
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
  backButton,
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
      {(title || description || actions || backButton || headerUtilities) && (
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            {backButton && (
              <div className="flex items-center">
                {backButton}
              </div>
            )}
            <div className="space-y-1">
              {title && (
                typeof title === 'string' ? (
                  <h1 className="text-3xl font-bold">{title}</h1>
                ) : (
                  title
                )
              )}
              {description && <p className="text-muted-foreground">{description}</p>}
            </div>
            {headerUtilities && (
              <div className="flex items-center gap-2">
                {headerUtilities}
              </div>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      
      <div className={cn(
        'container',
        (title || description || actions || headerUtilities) ? 'py-6' : 'pt-0',
        contentClassName
      )}>
        {children}
      </div>
    </div>
  );

  if (animate) {
    return <FadeIn duration={0.3}>{content}</FadeIn>;
  }

  return content;
}
