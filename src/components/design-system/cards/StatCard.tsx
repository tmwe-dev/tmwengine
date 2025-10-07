import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * StatCard - Card per statistiche con trend
 * 
 * @example
 * ```tsx
 * <StatCard
 *   icon={Users}
 *   label="Nuovi Contatti"
 *   value="234"
 *   trend="up"
 *   trendValue="+12%"
 * />
 * ```
 */

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: 'up' | 'down';
  trendValue?: string;
  className?: string;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  trendValue,
  className
}: StatCardProps) {
  return (
    <Card className={cn('border border-white/10 bg-background/40 backdrop-blur-md', className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <Icon className="h-5 w-5 text-primary" />
          {trend && (
            <div className={cn(
              'flex items-center gap-1 text-xs font-medium',
              trend === 'up' ? 'text-green-400' : 'text-red-400'
            )}>
              {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {trendValue}
            </div>
          )}
        </div>
        <div>
          <p className="text-2xl font-bold mb-1">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
