import { Beer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RadioSidebarTriggerProps {
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
  isAudioEnabled?: boolean;
  isAutoAdvanceEnabled?: boolean;
}

export function RadioSidebarTrigger({ 
  isOpen, 
  onToggle, 
  className,
  isAudioEnabled = false,
  isAutoAdvanceEnabled = false
}: RadioSidebarTriggerProps) {
  // ✅ 3 STATI: Spenta | Azzurra (solo audio) | Gialla+Bianca (audio+autoadvance)
  const beerColor = !isAudioEnabled 
    ? 'text-gray-500'
    : isAutoAdvanceEnabled 
      ? 'text-amber-500'
      : 'text-cyan-400';
  
  const foamColor = !isAudioEnabled
    ? 'bg-muted-foreground/30'
    : isAutoAdvanceEnabled
      ? 'bg-white'
      : 'bg-cyan-400/80';

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
    >
      <div className="relative">
        <Beer 
          className={cn(
            "w-6 h-6 transition-colors duration-300",
            beerColor
          )}
          strokeWidth={1}
        />
        {/* Schiuma sopra la birra */}
        <div className={cn(
          "absolute -top-0.5 left-1/2 -translate-x-1/2 w-4 h-1.5 rounded-full transition-colors duration-300",
          foamColor
        )} />
      </div>
    </button>
  );
}
