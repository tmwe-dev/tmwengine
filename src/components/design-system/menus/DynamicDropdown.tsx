import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * DynamicDropdown - Menu dropdown dinamico riutilizzabile
 * 
 * @example
 * ```tsx
 * <DynamicDropdown
 *   trigger={<Button>Menu</Button>}
 *   items={[
 *     { label: 'Profilo', icon: User, onClick: () => {} },
 *     { type: 'separator' },
 *     { label: 'Esci', icon: LogOut, onClick: () => {} }
 *   ]}
 * />
 * ```
 */

export interface DropdownItem {
  type?: 'item' | 'separator' | 'label';
  label?: string;
  icon?: LucideIcon;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'destructive';
}

interface DynamicDropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
}

export function DynamicDropdown({
  trigger,
  items,
  align = 'end',
  side = 'bottom',
  className
}: DynamicDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} side={side} className={cn('min-w-48', className)}>
        {items.map((item, index) => {
          if (item.type === 'separator') {
            return <DropdownMenuSeparator key={`separator-${index}`} />;
          }

          if (item.type === 'label') {
            return <DropdownMenuLabel key={`label-${index}`}>{item.label}</DropdownMenuLabel>;
          }

          const Icon = item.icon;
          return (
            <DropdownMenuItem
              key={`item-${index}`}
              onClick={item.onClick}
              disabled={item.disabled}
              className={cn(
                item.variant === 'destructive' && 'text-destructive focus:text-destructive'
              )}
            >
              {Icon && <Icon className="mr-2 h-4 w-4" />}
              {item.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
