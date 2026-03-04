import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AISidebarTriggerProps {
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
  hasActiveConversation?: boolean;
}

export function AISidebarTrigger({ 
  isOpen, 
  onToggle, 
  className,
  hasActiveConversation = false
}: AISidebarTriggerProps) {
  const sparklesColor = hasActiveConversation 
    ? 'text-purple-400' 
    : 'text-muted-foreground';

  return (
    <button
      onClick={onToggle}
      className={cn(
        "w-10 h-12 bg-transparent rounded-r-lg border border-border/20",
        "flex items-center justify-center",
        "transition-all duration-300",
        "hover:bg-muted/5",
        className
      )}
      aria-label="Toggle AI Assistant"
    >
      <Sparkles 
        className={cn(
          "w-5 h-5 transition-colors duration-300",
          sparklesColor
        )}
        strokeWidth={1.5}
      />
    </button>
  );
}
