import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { FadeIn } from '../animations/FadeIn';

/**
 * StatsGrid - Griglia di statistiche con animazioni
 * 
 * @example
 * ```tsx
 * <StatsGrid
 *   stats={[
 *     { label: 'Utenti', value: '1,234', icon: Users, trend: '+12%' },
 *     { label: 'Vendite', value: '€45K', icon: DollarSign, trend: '+8%' }
 *   ]}
 * />
 * ```
 */

export interface StatItem {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  description?: string;
  variant?: 'default' | 'success' | 'warning' | 'destructive';
}

interface StatsGridProps {
  stats: StatItem[];
  columns?: 2 | 3 | 4;
  className?: string;
  animate?: boolean;
}

export function StatsGrid({
  stats,
  columns = 4,
  className,
  animate = true
}: StatsGridProps) {
  const gridCols = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  };

  const variantColors = {
    default: 'text-primary',
    success: 'text-green-500',
    warning: 'text-yellow-500',
    destructive: 'text-red-500'
  };

  const content = (
    <div className={cn('grid gap-4', gridCols[columns], className)}>
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const variant = stat.variant || 'default';
        const card = (
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </p>
                <p className="text-3xl font-bold">{stat.value}</p>
                {stat.description && (
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                )}
                {stat.trend && (
                  <p
                    className={cn(
                      'text-sm font-medium',
                      stat.trendUp !== false ? 'text-green-500' : 'text-red-500'
                    )}
                  >
                    {stat.trend}
                  </p>
                )}
              </div>
              {Icon && (
                <div
                  className={cn(
                    'rounded-lg bg-muted p-3',
                    variantColors[variant]
                  )}
                >
                  <Icon className="h-6 w-6" />
                </div>
              )}
            </div>
          </Card>
        );

        return animate ? (
          <FadeIn key={index} delay={index * 0.1}>
            {card}
          </FadeIn>
        ) : (
          <div key={index}>{card}</div>
        );
      })}
    </div>
  );

  return content;
}
