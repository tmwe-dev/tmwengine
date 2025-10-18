import { Button } from '@/components/ui/button';
import { Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AutoFollowIndicatorProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  className?: string;
}

export const AutoFollowIndicator = ({
  enabled,
  onChange,
  className
}: AutoFollowIndicatorProps) => {
  return (
    <Button
      onClick={() => onChange(!enabled)}
      variant="ghost"
      size="sm"
      className={cn(
        "h-10 w-10 p-0 rounded-full transition-all",
        className
      )}
      title={enabled ? "Auto-Follow attivo" : "Auto-Follow disattivo"}
    >
      <Circle 
        className={cn(
          "h-6 w-6 transition-colors",
          enabled 
            ? "fill-green-500 text-green-500" 
            : "fill-red-500 text-red-500"
        )}
      />
    </Button>
  );
};
