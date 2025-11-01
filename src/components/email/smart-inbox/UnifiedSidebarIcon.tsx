import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UnifiedSidebarIconProps {
  icon: LucideIcon;
  isActive: boolean;
  onClick: () => void;
  position: 'top' | 'middle' | 'bottom';
  sidebarWidth?: number;
  shouldShow: boolean;
}

export function UnifiedSidebarIcon({
  icon: Icon,
  isActive,
  onClick,
  position,
  sidebarWidth = 280,
  shouldShow
}: UnifiedSidebarIconProps) {
  const positionClass = 
    position === 'top' ? 'top-[20rem]' :
    position === 'middle' ? 'top-[28rem]' :
    'top-[36rem]';
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "fixed left-0 z-[60]",
        "w-12 h-20 bg-transparent rounded-r-lg border border-white/20",
        "flex items-center justify-center",
        "transition-all duration-300 hover:bg-white/5",
        positionClass,
        // Visibilità
        !shouldShow && !isActive && "opacity-0 pointer-events-none",
        (shouldShow || isActive) && "opacity-100",
        // Segue sidebar quando aperta
        isActive && `translate-x-[${sidebarWidth}px]`
      )}
      aria-label="Toggle sidebar"
    >
      <Icon 
        className={cn(
          "w-6 h-6 transition-colors",
          isActive ? 'text-primary' : 'text-muted-foreground'
        )}
        strokeWidth={1}
      />
    </button>
  );
}
