import { Beer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RadioSidebarTriggerProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function RadioSidebarTrigger({ isOpen, onToggle }: RadioSidebarTriggerProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "fixed left-0 top-1/2 -translate-y-1/2 z-40",
        "w-12 h-20 bg-black rounded-r-lg",
        "flex items-center justify-center",
        "transition-all duration-200",
        "hover:w-14"
      )}
    >
      <Beer 
        className={cn(
          "w-6 h-6 transition-colors",
          isOpen ? "text-white" : "text-gray-500"
        )} 
      />
    </button>
  );
}
