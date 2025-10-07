import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

/**
 * Timeline - Componente timeline per visualizzare eventi cronologici
 * 
 * @example
 * ```tsx
 * <Timeline
 *   items={[
 *     {
 *       title: 'Evento 1',
 *       description: 'Descrizione evento',
 *       date: '2024-01-15',
 *       icon: CheckCircle,
 *       variant: 'success'
 *     }
 *   ]}
 * />
 * ```
 */

export interface TimelineItem {
  title: string;
  description?: string;
  date?: string;
  icon?: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'destructive';
  badge?: string;
}

interface TimelineProps {
  items: TimelineItem[];
  className?: string;
}

export function Timeline({ items, className }: TimelineProps) {
  const variantColors = {
    default: 'bg-primary border-primary/30',
    success: 'bg-green-500 border-green-500/30',
    warning: 'bg-yellow-500 border-yellow-500/30',
    destructive: 'bg-red-500 border-red-500/30'
  };

  const variantLineColors = {
    default: 'bg-primary/20',
    success: 'bg-green-500/20',
    warning: 'bg-yellow-500/20',
    destructive: 'bg-red-500/20'
  };

  return (
    <div className={cn('space-y-6', className)}>
      {items.map((item, index) => {
        const Icon = item.icon;
        const variant = item.variant || 'default';
        const isLast = index === items.length - 1;

        return (
          <div key={index} className="relative flex gap-4">
            {/* Line connector */}
            {!isLast && (
              <div
                className={cn(
                  'absolute left-4 top-8 h-full w-0.5',
                  variantLineColors[variant]
                )}
              />
            )}

            {/* Icon circle */}
            <div className="relative flex-shrink-0">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border-4 border-background',
                  variantColors[variant]
                )}
              >
                {Icon && <Icon className="h-4 w-4 text-white" />}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 space-y-1 pb-6">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">{item.title}</h4>
                {item.badge && (
                  <Badge variant="secondary" className="text-xs">
                    {item.badge}
                  </Badge>
                )}
              </div>
              {item.description && (
                <p className="text-sm text-muted-foreground">{item.description}</p>
              )}
              {item.date && (
                <p className="text-xs text-muted-foreground">{item.date}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
