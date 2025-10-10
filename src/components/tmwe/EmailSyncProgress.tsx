import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Database, Download, CheckCircle2, XCircle, Clock, Minus } from 'lucide-react';
import { DownloadStatus } from '@/hooks/useEmailSync';
import { useState, useEffect } from 'react';

interface EmailSyncProgressProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: DownloadStatus | null;
  isSyncing: boolean;
  onStop?: () => void;
  onMinimize?: () => void;
  // Multi-folder props
  isMultiFolder?: boolean;
  currentFolder?: string;
  foldersProcessed?: number;
  totalFolders?: number;
  overallProgress?: number;
  totalEmailsDownloaded?: number;
  totalEmailsToSync?: number;
  estimatedTimeRemaining?: number; // in seconds
}

export const EmailSyncProgress = ({ 
  open, 
  onOpenChange, 
  status, 
  isSyncing, 
  onStop, 
  onMinimize,
  isMultiFolder = false,
  currentFolder = '',
  foldersProcessed = 0,
  totalFolders = 0,
  overallProgress = 0,
  totalEmailsDownloaded = 0,
  totalEmailsToSync = 0,
  estimatedTimeRemaining = 0
}: EmailSyncProgressProps) => {
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

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary animate-pulse" />
            {isMultiFolder ? '🔄 Sincronizzazione Multi-Cartella' : 'Sincronizzazione Email'}
          </DialogTitle>
          <DialogDescription>
            {isMultiFolder 
              ? `Download da ${totalFolders} cartelle in corso...`
              : 'Download email dal server in corso...'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Multi-folder: Current Folder Info */}
          {isMultiFolder && (
            <div className="rounded-lg border bg-primary/5 p-3">
              <div className="text-sm font-medium mb-1">
                📁 Cartella corrente: {currentFolder}
              </div>
              <div className="text-xs text-muted-foreground">
                Cartella {foldersProcessed + 1} di {totalFolders}
              </div>
            </div>
          )}

          {/* Progress Bar - Overall for multi-folder, single for single */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {isMultiFolder ? 'Progresso globale' : 'Progresso'}
              </span>
              <span className="font-medium">
                {isMultiFolder ? overallProgress : progress}%
              </span>
            </div>
            <Progress 
              value={isMultiFolder ? overallProgress : progress} 
              className="h-2" 
            />
          </div>

          {/* Multi-folder: Current Folder Progress */}
          {isMultiFolder && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progresso cartella corrente</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            {!isMultiFolder && (
              <div className="rounded-lg border bg-card p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Download className="h-4 w-4" />
                  Batch
                </div>
                <div className="text-2xl font-bold">
                  {status.currentBatch}/{status.totalBatches}
                </div>
              </div>
            )}

            <div className="rounded-lg border bg-card p-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Database className="h-4 w-4" />
                {isMultiFolder ? 'Totale scaricate' : 'Email scaricate'}
              </div>
              <div className="text-2xl font-bold">
                {isMultiFolder ? totalEmailsDownloaded : status.downloadedCount}
              </div>
            </div>

            <div className={`rounded-lg border bg-card p-3 ${isMultiFolder ? '' : 'col-span-2'}`}>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <CheckCircle2 className="h-4 w-4" />
                {isMultiFolder ? 'Totale da scaricare' : 'Totale sul server'}
              </div>
              <div className="text-2xl font-bold">
                {isMultiFolder ? totalEmailsToSync : status.totalOnServer}
              </div>
            </div>
          </div>

          {/* Speed & ETA */}
          {isSyncing && (
            <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
              {emailsPerSecond > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">🚀 Velocità</span>
                  <span className="font-medium">{emailsPerSecond} email/sec</span>
                </div>
              )}
              {isMultiFolder && estimatedTimeRemaining > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">⏱️ Tempo rimanente</span>
                  <span className="font-medium">{formatTime(estimatedTimeRemaining)}</span>
                </div>
              )}
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

          {/* Action Buttons */}
          <div className="flex gap-2">
            {onMinimize && (
              <Button 
                onClick={onMinimize}
                variant="outline"
                className="flex-1"
                size="sm"
              >
                <Minus className="h-4 w-4 mr-2" />
                Riduci a icona
              </Button>
            )}
            {isSyncing && onStop && (
              <Button 
                onClick={onStop}
                variant="destructive"
                className="flex-1"
                size="sm"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Interrompi
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
