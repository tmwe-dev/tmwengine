import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * DataCard - Card per visualizzare dati con icona e valore
 * 
 * @example
 * ```tsx
 * <DataCard
 *   icon={Users}
 *   label="Utenti Totali"
 *   value="1,234"
 *   variant="primary"
 * />
 * ```
 */

interface DataCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtext?: string;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'destructive';
  className?: string;
}

export function DataCard({
  icon: Icon,
  label,
  value,
  subtext,
  variant = 'primary',
  className
}: DataCardProps) {
  const iconColors = {
    primary: 'text-purple-400',
    secondary: 'text-blue-400',
    success: 'text-green-400',
    warning: 'text-yellow-400',
    destructive: 'text-red-400'
  };

  const gradients = {
    primary: 'from-purple-400/20 to-transparent',
    secondary: 'from-blue-400/20 to-transparent',
    success: 'from-green-400/20 to-transparent',
    warning: 'from-yellow-400/20 to-transparent',
    destructive: 'from-red-400/20 to-transparent'
  };

  return (
    <Card className={cn('border border-white/10 overflow-hidden', className)}>
      <div className={cn('absolute inset-0 bg-gradient-to-br', gradients[variant])} />
      <CardContent className="relative p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-2">{label}</p>
            <p className="text-3xl font-bold">{value}</p>
            {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
          </div>
          <div className={cn('p-3 rounded-lg bg-background/50', iconColors[variant])}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
