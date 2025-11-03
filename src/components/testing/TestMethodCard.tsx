import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TestMethodCardProps {
  name: string;
  icon: string;
  description: string;
  onTest: () => void;
  isRunning: boolean;
  disabled?: boolean;
}

export function TestMethodCard({
  name,
  icon,
  description,
  onTest,
  isRunning,
  disabled = false
}: TestMethodCardProps) {
  return (
    <Card className={cn(
      "p-3 flex items-center justify-between gap-3 transition-all",
      isRunning && "ring-2 ring-primary"
    )}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="text-2xl" role="img" aria-label={name}>
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{name}</p>
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        </div>
      </div>
      
      <Button
        size="sm"
        variant="outline"
        onClick={onTest}
        disabled={isRunning || disabled}
        className="shrink-0"
      >
        {isRunning ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
          </>
        ) : (
          '▶ Test'
        )}
      </Button>
    </Card>
  );
}
