import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Breadcrumbs - Navigazione breadcrumb
 * 
 * @example
 * ```tsx
 * <Breadcrumbs
 *   items={[
 *     { label: 'Home', to: '/' },
 *     { label: 'Prodotti', to: '/prodotti' },
 *     { label: 'Dettaglio' }
 *   ]}
 * />
 * ```
 */

export interface BreadcrumbItem {
  label: string;
  to?: string;
  icon?: React.ReactNode;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
  className?: string;
}

export function Breadcrumbs({
  items,
  showHome = true,
  className
}: BreadcrumbsProps) {
  const allItems = showHome
    ? [{ label: 'Home', to: '/', icon: <Home className="h-4 w-4" /> }, ...items]
    : items;

  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center', className)}>
      <ol className="flex items-center space-x-2">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;

          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground mx-2" />
              )}
              {isLast || !item.to ? (
                <span
                  className={cn(
                    'flex items-center gap-1 text-sm',
                    isLast
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground'
                  )}
                >
                  {item.icon}
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.to}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.icon}
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
