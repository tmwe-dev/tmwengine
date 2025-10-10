import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Database, Download, CheckCircle2 } from 'lucide-react';
import { DownloadStatus } from '@/hooks/useEmailSync';

interface EmailSyncProgressProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: DownloadStatus | null;
  isSyncing: boolean;
}

export const EmailSyncProgress = ({ open, onOpenChange, status, isSyncing }: EmailSyncProgressProps) => {
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

          {/* Status Message */}
          {status.isComplete ? (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <span className="font-medium">Sincronizzazione completata!</span>
            </div>
          ) : isSyncing ? (
            <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
              <Download className="h-4 w-4 animate-bounce" />
              <span>Scaricamento batch {status.currentBatch} di {status.totalBatches}...</span>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};
