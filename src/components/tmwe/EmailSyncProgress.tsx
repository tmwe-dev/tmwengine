import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Database, Download, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { DownloadStatus } from '@/hooks/useEmailSync';
import { useState, useEffect } from 'react';

interface EmailSyncProgressProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: DownloadStatus | null;
  isSyncing: boolean;
  onStop?: () => void;
}

export const EmailSyncProgress = ({ open, onOpenChange, status, isSyncing, onStop }: EmailSyncProgressProps) => {
  const [countdown, setCountdown] = useState(2);
  const [emailsPerSecond, setEmailsPerSecond] = useState(0);
  const [startTime] = useState(Date.now());

  // Calcola velocità di download
  useEffect(() => {
    if (!status || !isSyncing) return;
    const elapsed = (Date.now() - startTime) / 1000;
    if (elapsed > 0 && status.downloadedCount > 0) {
      setEmailsPerSecond(Math.round(status.downloadedCount / elapsed * 10) / 10);
    }
  }, [status, isSyncing, startTime]);

  // Countdown tra batch
  useEffect(() => {
    if (!isSyncing || !status) return;
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 0) return 2;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isSyncing, status?.currentBatch]);

  if (!status) return null;

  const progress = status.totalBatches > 0 
    ? Math.round((status.currentBatch / status.totalBatches) * 100) 
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary animate-pulse" />
            Sincronizzazione Email
          </DialogTitle>
          <DialogDescription>
            Download email dal server in corso...
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border bg-card p-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Download className="h-4 w-4" />
                Batch
              </div>
              <div className="text-2xl font-bold">
                {status.currentBatch}/{status.totalBatches}
              </div>
            </div>

            <div className="rounded-lg border bg-card p-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Database className="h-4 w-4" />
                Email scaricate
              </div>
              <div className="text-2xl font-bold">
                {status.downloadedCount}
              </div>
            </div>

            <div className="col-span-2 rounded-lg border bg-card p-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <CheckCircle2 className="h-4 w-4" />
                Totale sul server
              </div>
              <div className="text-2xl font-bold">
                {status.totalOnServer}
              </div>
            </div>
          </div>

          {/* Speed & ETA */}
          {isSyncing && emailsPerSecond > 0 && (
            <div className="rounded-lg border bg-muted/50 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Velocità</span>
                <span className="font-medium">{emailsPerSecond} email/sec</span>
              </div>
            </div>
          )}

          {/* Status Message */}
          {status.isComplete ? (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <span className="font-medium">Sincronizzazione completata!</span>
            </div>
          ) : isSyncing ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                <Download className="h-4 w-4 animate-bounce" />
                <span>Micro-batch {status.currentBatch} di {status.totalBatches} (5 email/batch)</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Prossimo batch tra {countdown} secondi...</span>
              </div>
            </div>
          ) : null}

          {/* Stop Button */}
          {isSyncing && onStop && (
            <Button 
              onClick={onStop}
              variant="destructive"
              className="w-full"
              size="sm"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Interrompi sincronizzazione
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
