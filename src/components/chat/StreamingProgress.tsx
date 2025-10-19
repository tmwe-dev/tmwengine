import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { ToolProgress } from '@/hooks/useStreamingChat';
import { cn } from '@/lib/utils';

interface StreamingProgressProps {
  toolProgress: ToolProgress[];
  isVisible: boolean;
  onCancel: () => void;
}

export const StreamingProgress = ({
  toolProgress,
  isVisible,
  onCancel
}: StreamingProgressProps) => {
  if (!isVisible || toolProgress.length === 0) return null;

  const completedCount = toolProgress.filter(t => t.status === 'complete').length;
  const total = toolProgress[0]?.total || toolProgress.length;

  return (
    <div className="mb-4 animate-fade-in transition-all duration-200">
      <div className="border-l-4 border-primary bg-primary/5 dark:bg-primary/10 rounded-lg p-4 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
            <span className="text-sm font-medium">
              Elaborazione in corso... ({completedCount}/{total} completati)
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-7 px-2 text-xs hover:bg-destructive hover:text-destructive-foreground transition-colors duration-200"
          >
            <X className="h-3 w-3 mr-1" />
            Annulla
          </Button>
        </div>

        {/* Tool List */}
        <div className="space-y-2">
          {toolProgress.map((tool) => (
            <div
              key={tool.index}
              className={cn(
                "pl-4 py-2 rounded transition-all duration-200",
                tool.status === 'complete' && "bg-green-50 dark:bg-green-900/20",
                tool.status === 'running' && "bg-yellow-50 dark:bg-yellow-900/20 animate-pulse",
                tool.status === 'error' && "bg-red-50 dark:bg-red-900/20",
                tool.status === 'pending' && "opacity-50"
              )}
            >
              <div className="flex items-start gap-2">
                <span className="text-base flex-shrink-0 mt-0.5">
                  {tool.status === 'complete' && '✅'}
                  {tool.status === 'running' && '⏳'}
                  {tool.status === 'error' && '❌'}
                  {tool.status === 'pending' && '⏺️'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">{tool.icon}</span>
                    <span className={cn(
                      "text-sm font-medium",
                      tool.status === 'complete' && "text-green-700 dark:text-green-300",
                      tool.status === 'running' && "text-yellow-700 dark:text-yellow-300",
                      tool.status === 'error' && "text-red-700 dark:text-red-300",
                      tool.status === 'pending' && "text-muted-foreground"
                    )}>
                      {tool.startMessage || '(in attesa...)'}
                    </span>
                  </div>
                  
                  {tool.completeMessage && tool.status === 'complete' && (
                    <div className="ml-6 text-xs text-green-600 dark:text-green-400 mt-1">
                      └─ {tool.completeMessage}
                    </div>
                  )}
                  
                  {tool.errorMessage && tool.status === 'error' && (
                    <div className="ml-6 text-xs text-red-600 dark:text-red-400 mt-1">
                      └─ {tool.errorMessage}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
