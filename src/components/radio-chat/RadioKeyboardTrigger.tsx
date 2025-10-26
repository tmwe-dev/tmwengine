import { Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RadioKeyboardTriggerProps {
  isActive: boolean;
  onClick: () => void;
  position: 'left' | 'right';
}

export function RadioKeyboardTrigger({ isActive, onClick, position }: RadioKeyboardTriggerProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-10 h-10 bg-black/80 backdrop-blur-sm rounded-full",
        "flex items-center justify-center",
        "transition-all duration-200",
        "hover:scale-110 hover:bg-black/90",
        "border-2 border-purple-400/40",
        "shadow-[0_0_20px_rgba(168,85,247,0.3)]",
        position === 'left' ? 'translate-x-[-120%]' : 'translate-x-[120%]'
      )}
      aria-label={`Toggle input (${position})`}
    >
      <Keyboard 
        className={cn(
          "w-5 h-5 transition-colors",
          isActive ? 'text-purple-400' : 'text-white/60',
          "stroke-[1.5]"
        )}
        strokeWidth={1.5}
      />
    </button>
  );
}
