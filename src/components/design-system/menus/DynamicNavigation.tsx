import React from 'react';
import { NavLink } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

/**
 * DynamicNavigation - Menu navigazione dinamico
 * 
 * @example
 * ```tsx
 * <DynamicNavigation
 *   items={[
 *     { label: 'Home', icon: Home, to: '/', badge: 5 },
 *     { label: 'Profilo', icon: User, to: '/profilo' }
 *   ]}
 * />
 * ```
 */

export interface NavigationItem {
  label: string;
  icon?: LucideIcon;
  to: string;
  badge?: number | string;
  disabled?: boolean;
}

interface DynamicNavigationProps {
  items: NavigationItem[];
  orientation?: 'horizontal' | 'vertical';
  variant?: 'default' | 'pills' | 'underline';
  className?: string;
}

export function DynamicNavigation({
  items,
  orientation = 'horizontal',
  variant = 'default',
  className
}: DynamicNavigationProps) {
  const containerClasses = cn(
    'flex gap-2',
    orientation === 'horizontal' ? 'flex-row items-center' : 'flex-col',
    className
  );

  const getNavLinkClasses = ({ isActive }: { isActive: boolean }) => {
    const base = 'flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200';
    
    if (variant === 'pills') {
      return cn(
        base,
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'hover:bg-muted text-muted-foreground hover:text-foreground'
      );
    }

    if (variant === 'underline') {
      return cn(
        'flex items-center gap-2 px-4 py-2 border-b-2 transition-all duration-200',
        isActive
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
      );
    }

    return cn(
      base,
      isActive
        ? 'bg-muted text-foreground font-medium'
        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
    );
  };

  return (
    <nav className={containerClasses}>
      {items.map((item) => {
        const Icon = item.icon;
        
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={getNavLinkClasses}
            aria-disabled={item.disabled}
          >
            {Icon && <Icon className="h-4 w-4" />}
            <span>{item.label}</span>
            {item.badge !== undefined && (
              <Badge variant="secondary" className="ml-auto">
                {item.badge}
              </Badge>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
