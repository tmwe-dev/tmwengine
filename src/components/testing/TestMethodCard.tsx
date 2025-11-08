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
  logs?: string[];
  status?: 'idle' | 'running' | 'success' | 'error';
}

export function TestMethodCard({
  name,
  icon,
  description,
  onTest,
  isRunning,
  disabled = false,
  logs = [],
  status = 'idle'
}: TestMethodCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'success': return 'border-green-500';
      case 'error': return 'border-red-500';
      case 'running': return 'border-blue-500';
      default: return '';
    }
  };

  return (
    <Card className={cn(
      "p-4 flex flex-col gap-3 transition-all h-full",
      isRunning && "ring-2 ring-primary",
      getStatusColor()
    )}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-3xl" role="img" aria-label={name}>
            {icon}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-base">{name}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
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
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
              Running
            </>
          ) : (
            '▶ Test'
          )}
        </Button>
      </div>

      {/* Logs area */}
      {logs.length > 0 && (
        <div className="border rounded-md p-2 bg-muted/30 max-h-[200px] overflow-y-auto">
          <div className="space-y-1">
            {logs.map((log, index) => (
              <div key={index} className="text-xs font-mono text-muted-foreground">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
