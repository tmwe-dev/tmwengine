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
    : 'text-gray-500';

  return (
    <button
      onClick={onToggle}
      className={cn(
        "w-12 h-20 bg-transparent rounded-r-lg border border-white/20",
        "flex items-center justify-center",
        "transition-all duration-300",
        "hover:bg-white/5",
        className
      )}
      aria-label="Toggle AI Assistant"
    >
      <Sparkles 
        className={cn(
          "w-6 h-6 transition-colors duration-300",
          sparklesColor
        )}
        strokeWidth={1.5}
      />
    </button>
  );
}
