import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UnifiedSidebarBadgeProps {
  icon: LucideIcon;
  onClick: () => void;
  isActive: boolean;
  position: 'top' | 'middle' | 'bottom';
}

export function UnifiedSidebarBadge({ 
  icon: Icon, 
  onClick, 
  isActive,
  position 
}: UnifiedSidebarBadgeProps) {
  const getPositionClass = () => {
    switch(position) {
      case 'top':
        return 'top-4';
      case 'middle':
        return 'top-20';
      case 'bottom':
        return 'top-36';
    }
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "fixed left-4 z-[60] w-12 h-12 rounded-xl transition-all duration-300",
        "bg-background/80 backdrop-blur-md border border-border/50",
        "flex items-center justify-center",
        "hover:bg-primary/20 hover:border-primary/50",
        "shadow-lg hover:shadow-xl",
        isActive && "bg-primary/30 border-primary",
        getPositionClass()
      )}
    >
      <Icon className={cn(
        "w-5 h-5 transition-colors",
        isActive ? "text-primary" : "text-muted-foreground"
      )} />
    </button>
  );
}
