import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LucideIcon } from 'lucide-react';
import React from 'react';

interface AnimatedNavButtonProps {
  /** Icon component from lucide-react */
  icon: LucideIcon;
  /** Button label text */
  label: string;
  /** Whether this button is currently active/selected */
  isActive?: boolean;
  /** Optional badge count to display */
  badgeCount?: number;
  /** Click handler */
  onClick?: () => void;
  /** Whether to show only the icon (collapsed mode) */
  isCollapsed?: boolean;
  /** Optional className for additional styling */
  className?: string;
  /** Color scheme: 'primary' (purple) or 'neutral' (white/gray) */
  colorScheme?: 'primary' | 'neutral';
}

/**
 * AnimatedNavButton - Pulsante di navigazione animato con linea, icona wiggle e badge opzionale
 * 
 * Pattern:
 * - Linea animata in basso che si muove con bounce effect al hover
 * - Icona che si ingrandisce e "wiggle" (oscillazione) al hover
 * - Badge opzionale per contatori (es. messaggi non letti)
 * - Supporto modalità collassata (solo icona)
 * - Due schemi colore: primary (viola) e neutral (bianco/grigio)
 * 
 * @example
 * ```tsx
 * <AnimatedNavButton
 *   icon={Inbox}
 *   label="Inbox"
 *   isActive={true}
 *   badgeCount={5}
 *   onClick={() => handleNavigation('inbox')}
 *   colorScheme="primary"
 * />
 * ```
 */
export const AnimatedNavButton: React.FC<AnimatedNavButtonProps> = ({
  icon: Icon,
  label,
  isActive = false,
  badgeCount,
  onClick,
  isCollapsed = false,
  className,
  colorScheme = 'primary'
}) => {
  const primaryColor = colorScheme === 'primary' ? 'purple' : 'blue';
  const lineGradientActive = colorScheme === 'primary'
    ? 'after:bg-gradient-to-r after:from-purple-400/65 after:via-purple-600 after:via-40% after:to-transparent'
    : 'after:bg-gradient-to-r after:from-blue-400/65 after:via-blue-600 after:via-40% after:to-transparent';
  
  const lineGradientInactive = 'after:bg-gradient-to-r after:from-white/65 after:via-black after:via-40% after:to-transparent';
  
  const iconColorActive = colorScheme === 'primary' ? 'text-purple-400' : 'text-blue-400';
  const textColorActive = colorScheme === 'primary' ? 'text-purple-300' : 'text-blue-300';
  const badgeColorActive = colorScheme === 'primary' 
    ? 'text-purple-300 border-purple-300' 
    : 'text-blue-300 border-blue-300';

  return (
    <Button
      variant={isActive ? 'secondary' : 'ghost'}
      className={cn(
        'relative w-full group transition-all duration-200 overflow-hidden',
        isCollapsed ? 'justify-center px-2' : 'justify-between',
        isActive && 'bg-email-selected text-primary-foreground',
        // Linea animata in basso
        'after:content-[""] after:absolute after:bottom-0 after:left-0 after:w-[60%] after:h-[1px] after:origin-left',
        isActive ? lineGradientActive : lineGradientInactive,
        'hover:bg-transparent',
        'hover:after:animate-line-bounce',
        className
      )}
      onClick={onClick}
      title={isCollapsed ? `${label} ${badgeCount ? `(${badgeCount})` : ''}` : undefined}
    >
      <div className={cn("flex items-center", isCollapsed ? "" : "min-w-0")}>
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
      {!isCollapsed && badgeCount !== undefined && badgeCount > 0 && (
        <Badge variant="secondary" className={cn(
          "ml-2 h-5 min-w-5 px-1.5 flex-shrink-0 bg-transparent border",
          isActive ? badgeColorActive : "text-white border-white"
        )}>
          {badgeCount}
        </Badge>
      )}
    </Button>
  );
};
