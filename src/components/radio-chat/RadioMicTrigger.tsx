import { Mic } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RadioMicTriggerProps {
  isActive: boolean;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}

export function RadioMicTrigger({ 
  isActive, 
  onClick, 
  className,
  disabled = false 
}: RadioMicTriggerProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-12 h-20 bg-transparent rounded-r-lg border border-white/20",
        "flex items-center justify-center",
        "transition-all duration-300",
        "hover:bg-white/5",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      aria-label="Toggle audio controls"
    >
      <Mic 
        className={cn(
          "w-6 h-6 transition-colors duration-300",
          isActive ? 'text-cyan-400' : 'text-gray-500'
        )}
        strokeWidth={1}
      />
    </button>
  );
}
