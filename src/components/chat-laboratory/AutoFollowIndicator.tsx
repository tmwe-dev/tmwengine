import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface AutoFollowIndicatorProps {
  isEnabled: boolean;
  onChange: (enabled: boolean) => void;
}

export const AutoFollowIndicator = ({ isEnabled, onChange }: AutoFollowIndicatorProps) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onChange(!isEnabled)}
            className={cn(
              "h-8 w-8 rounded-full transition-all",
              isEnabled 
                ? "bg-green-500/20 hover:bg-green-500/30 text-green-600" 
                : "bg-red-500/20 hover:bg-red-500/30 text-red-600"
            )}
          >
            <div className={cn(
              "h-3 w-3 rounded-full",
              isEnabled ? "bg-green-500" : "bg-red-500"
            )} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            {isEnabled ? "Auto-Follow attivo" : "Auto-Follow disattivo"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
