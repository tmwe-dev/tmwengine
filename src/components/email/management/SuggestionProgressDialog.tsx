import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useRef } from 'react';

export interface SuggestionProgress {
  current: number;
  total: number;
  currentSender: string;
  currentCompany: string;
  successCount: number;
  errorCount: number;
  logs: Array<{
    timestamp: string;
    type: 'success' | 'error' | 'info';
    message: string;
    senderEmail?: string;
  }>;
}

interface SuggestionProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  progress: SuggestionProgress | null;
  isGenerating: boolean;
  onCancel?: () => void;
}

export function SuggestionProgressDialog({
  open,
  onOpenChange,
  progress,
  isGenerating,
  onCancel,
}: SuggestionProgressDialogProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs to bottom when new log arrives
  useEffect(() => {
    if (scrollAreaRef.current && progress?.logs.length) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [progress?.logs.length]);

  if (!progress) return null;

  const progressPercentage = (progress.current / progress.total) * 100;
  const remainingCount = progress.total - progress.current;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isGenerating ? (
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-success" />
            )}
            🤖 Generazione Suggerimenti AI
          </DialogTitle>
          <DialogDescription>
            Elaborazione {progress.current}/{progress.total} mittenti
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={progressPercentage} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{progress.current} completati</span>
              <span>{progressPercentage.toFixed(1)}%</span>
              <span>{remainingCount} rimanenti</span>
            </div>
          </div>

          {/* Current Processing */}
          {isGenerating && progress.currentSender && (
            <Card className="p-4 bg-primary/5 border-primary/20">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-primary flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">{progress.currentCompany}</p>
                  <p className="text-xs text-muted-foreground truncate">{progress.currentSender}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Live Stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-3 text-center">
              <div className="text-2xl font-bold text-success flex items-center justify-center gap-1">
                <CheckCircle2 className="w-5 h-5" />
                {progress.successCount}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Successi</div>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-2xl font-bold text-destructive flex items-center justify-center gap-1">
                <XCircle className="w-5 h-5" />
                {progress.errorCount}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Errori</div>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-2xl font-bold text-muted-foreground flex items-center justify-center gap-1">
                <Info className="w-5 h-5" />
                {remainingCount}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Rimanenti</div>
            </Card>
          </div>

          {/* Scrollable Log */}
          <Card className="flex-1 min-h-0 border">
            <div className="px-3 py-2 border-b bg-muted/30">
              <p className="text-xs font-medium text-muted-foreground">Log Elaborazione</p>
            </div>
            <ScrollArea className="h-full" ref={scrollAreaRef} viewportRef={scrollAreaRef}>
              <div className="p-3 space-y-2">
                {progress.logs.map((log, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className="text-muted-foreground font-mono flex-shrink-0 w-16">
                      {new Date(log.timestamp).toLocaleTimeString('it-IT', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        second: '2-digit' 
                      })}
                    </span>
                    {log.type === 'success' && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0 mt-0.5" />
                    )}
                    {log.type === 'error' && (
                      <XCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0 mt-0.5" />
                    )}
                    {log.type === 'info' && (
                      <Info className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                    )}
                    <span className={cn(
                      "flex-1 leading-relaxed",
                      log.type === 'success' && 'text-success',
                      log.type === 'error' && 'text-destructive',
                      log.type === 'info' && 'text-foreground'
                    )}>
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </div>

        {/* Actions */}
        <DialogFooter className="flex-shrink-0">
          {isGenerating ? (
            <Button variant="outline" onClick={onCancel} disabled={!onCancel}>
              Annulla
            </Button>
          ) : (
            <Button onClick={() => onOpenChange(false)}>
              Chiudi
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
