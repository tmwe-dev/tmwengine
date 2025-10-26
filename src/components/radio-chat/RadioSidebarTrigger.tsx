import { Beer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RadioSidebarTriggerProps {
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

export function RadioSidebarTrigger({ isOpen, onToggle, className }: RadioSidebarTriggerProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "w-12 h-20 bg-transparent rounded-r-lg border border-white/20",
        "flex items-center justify-center",
        "transition-all duration-200",
        "hover:bg-white/5",
        className
      )}
    >
      <Beer 
        className={cn(
          "w-6 h-6 transition-colors",
          isOpen ? "text-white" : "text-gray-500"
        )}
        strokeWidth={1}
      />
    </button>
  );
}
