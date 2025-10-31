import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LucideIcon, ChevronDown } from 'lucide-react';
import React from 'react';
import { CollapsibleTrigger } from '@/components/ui/collapsible';

interface AnimatedGroupButtonProps {
  /** Icon component from lucide-react */
  icon: LucideIcon;
  /** Group label text */
  label: string;
  /** Whether this group contains an active item */
  isActive?: boolean;
  /** Whether the group is expanded */
  isExpanded?: boolean;
  /** Whether to show only the icon (collapsed mode) */
  isCollapsed?: boolean;
  /** Optional className for additional styling */
  className?: string;
  /** Color scheme: 'primary' (purple) or 'neutral' (blue) */
  colorScheme?: 'primary' | 'neutral';
}

/**
 * AnimatedGroupButton - Pulsante per gruppi collassabili con animazioni
 * 
 * Pattern:
 * - Linea animata in basso che si muove con bounce effect al hover
 * - Icona che si ingrandisce e "wiggle" (oscillazione) al hover
 * - Chevron che ruota quando il gruppo è espanso
 * - Stato attivo quando un item del gruppo è attivo
 * - Due schemi colore: primary (viola) e neutral (blu)
 */
export const AnimatedGroupButton: React.FC<AnimatedGroupButtonProps> = ({
  icon: Icon,
  label,
  isActive = false,
  isExpanded = false,
  isCollapsed = false,
  className,
  colorScheme = 'primary'
}) => {
  const lineGradientActive = colorScheme === 'primary'
    ? 'after:bg-gradient-to-r after:from-purple-400/65 after:via-purple-600 after:via-40% after:to-transparent'
    : 'after:bg-gradient-to-r after:from-blue-400/65 after:via-blue-600 after:via-40% after:to-transparent';
  
  const lineGradientInactive = 'after:bg-gradient-to-r after:from-white/65 after:via-black after:via-40% after:to-transparent';
  
  const iconColorActive = colorScheme === 'primary' ? 'text-purple-400' : 'text-blue-400';
  const textColorActive = colorScheme === 'primary' ? 'text-purple-300' : 'text-blue-300';

  return (
    <CollapsibleTrigger asChild>
      <Button
        variant="ghost"
        className={cn(
          'relative w-full group transition-all duration-200 overflow-hidden border',
          isCollapsed ? 'justify-center px-2' : 'justify-between',
          // Solo bordo + ombra quando attivo, nessun background
          isActive 
            ? `border-${colorScheme === 'primary' ? 'purple' : 'blue'}-500 shadow-[2px_2px_4px_rgba(${colorScheme === 'primary' ? '168,85,247' : '59,130,246'},0.5)]`
            : 'border-transparent hover:border-white/30',
          // Linea animata in basso
          'after:content-[""] after:absolute after:bottom-0 after:left-0 after:w-[60%] after:h-[1px] after:origin-left',
          isActive ? lineGradientActive : lineGradientInactive,
          'hover:bg-transparent',
          'hover:after:animate-line-bounce',
          className
        )}
        title={isCollapsed ? label : undefined}
      >
        <div className={cn("flex items-center", isCollapsed ? "" : "min-w-0 flex-1")}>
          <Icon className={cn(
            "h-4 w-4 flex-shrink-0 transition-all duration-200",
            "group-hover:scale-105 group-hover:animate-wiggle",
            isActive ? `${iconColorActive} scale-110` : "scale-100",
            isCollapsed ? "" : "mr-3"
          )} />
          {!isCollapsed && (
            <span className={cn(
              "truncate transition-transform duration-200",
              "group-hover:scale-110",
              isActive ? `${textColorActive} font-semibold scale-110` : "scale-100"
            )}>
              {label}
            </span>
          )}
        </div>
        {!isCollapsed && (
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-all duration-200 flex-shrink-0 ml-2",
              "group-hover:scale-110",
              isExpanded && "rotate-180",
              isActive ? iconColorActive : ""
            )}
          />
        )}
      </Button>
    </CollapsibleTrigger>
  );
};