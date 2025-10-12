import { Button } from '@/components/ui/button';
import { Hand } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface InterruptButtonProps {
  isAISpeaking: boolean;
  onInterrupt: () => void;
  isDisabled?: boolean;
}

export const InterruptButton = ({ 
  isAISpeaking, 
  onInterrupt,
  isDisabled = false 
}: InterruptButtonProps) => {
  
  const handleInterrupt = () => {
    onInterrupt();
    toast({ 
      title: "⛔ Interruzione inviata", 
      description: "L'AI si fermerà al prossimo checkpoint"
    });
  };

  return (
    <div className="relative">
      {/* Interrupt Button */}
      <Button
        variant={isAISpeaking ? "destructive" : "outline"}
        size="lg"
        disabled={!isAISpeaking || isDisabled}
        onClick={handleInterrupt}
        className={cn(
          "h-16 w-16 rounded-full transition-all",
          isAISpeaking && "animate-pulse shadow-lg shadow-red-500/50"
        )}
      >
        <Hand className={cn(
          "h-8 w-8 transition-colors",
          !isAISpeaking && "text-muted-foreground",
          isAISpeaking && "text-white"
        )} />
      </Button>

      {/* Status indicator */}
      {isAISpeaking && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
      )}

      {/* Label */}
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-muted-foreground">
        {isAISpeaking ? "Interrompi AI" : "AI ferma"}
      </div>
    </div>
  );
};
