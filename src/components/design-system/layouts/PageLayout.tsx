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
  title?: string;
  description?: string;
  actions?: React.ReactNode;
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
  children,
  className,
  headerClassName,
  contentClassName,
  gradient = false,
  animate = true
}: PageLayoutProps) {
  const content = (
    <div className={cn('min-h-screen w-full', className)}>
      {(title || description || actions) && (
        <div
          className={cn(
            'border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
            gradient && 'bg-gradient-to-br from-background via-background to-muted/20',
            headerClassName
          )}
        >
          <div className="container py-6 space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                {title && (
                  <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
                )}
                {description && (
                  <p className="text-muted-foreground">{description}</p>
                )}
              </div>
              {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>
          </div>
        </div>
      )}
      
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
