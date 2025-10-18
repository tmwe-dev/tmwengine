import { Button } from '@/components/ui/button';
import { StopCircle } from 'lucide-react';
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
  
  if (!isAISpeaking) return null; // ✅ Nascosto quando AI non sta parlando

  const handleInterrupt = () => {
    onInterrupt();
    toast({ 
      title: "⛔ Interruzione inviata", 
      description: "L'AI si fermerà al prossimo checkpoint"
    });
  };

  return (
    <Button
      variant="destructive"
      size="sm"
      disabled={isDisabled}
      onClick={handleInterrupt}
      className={cn(
        "gap-2 shadow-lg shadow-red-500/20 animate-pulse"
      )}
    >
      <StopCircle className="h-4 w-4" />
      <span className="font-medium">Interrompi AI</span>
    </Button>
  );
};
