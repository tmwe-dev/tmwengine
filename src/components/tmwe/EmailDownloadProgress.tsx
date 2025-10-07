import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Download, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmailDownloadProgressProps {
  onDownloadComplete: (emails: any[]) => void;
  totalEmails: number;
  onStartDownload: () => Promise<void>;
  isDownloading: boolean;
  downloadedCount: number;
  downloadError: string | null;
}

export const EmailDownloadProgress = ({
  onDownloadComplete,
  totalEmails,
  onStartDownload,
  isDownloading,
  downloadedCount,
  downloadError,
}: EmailDownloadProgressProps) => {
  const progressPercentage = totalEmails > 0 ? (downloadedCount / totalEmails) * 100 : 0;
  const isComplete = downloadedCount >= totalEmails && totalEmails > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={isDownloading ? 'secondary' : 'ghost'}
          size="sm"
          className={cn(
            'relative',
            isComplete && 'text-green-600',
            downloadError && 'text-destructive'
          )}
        >
          {isDownloading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : isComplete ? (
            <CheckCircle2 className="h-4 w-4 mr-2" />
          ) : downloadError ? (
            <XCircle className="h-4 w-4 mr-2" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {isDownloading || isComplete ? (
            <span className="text-xs">
              {downloadedCount.toLocaleString()} / {totalEmails.toLocaleString()}
            </span>
          ) : (
            <span className="text-xs">Analizza</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[90vw] sm:w-80 md:w-96" align="start">
        <div className="space-y-3 sm:space-y-4">
          <div>
            <h4 className="font-semibold mb-1">Download Email Completo</h4>
            <p className="text-sm text-muted-foreground">
              Scarica tutte le email per analisi complete dei mittenti
            </p>
          </div>

          {!isDownloading && !isComplete && !downloadError && (
            <Button
              onClick={onStartDownload}
              className="w-full"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Inizia Download ({totalEmails.toLocaleString()} email)
            </Button>
          )}

          {(isDownloading || isComplete) && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-medium">
                  {progressPercentage.toFixed(1)}%
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{downloadedCount.toLocaleString()} scaricate</span>
                <span>{totalEmails.toLocaleString()} totali</span>
              </div>
            </div>
          )}

          {isComplete && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">
                Download completato!
              </span>
            </div>
          )}

          {downloadError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
              <XCircle className="h-5 w-5 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Errore durante il download</p>
                <p className="text-xs mt-1">{downloadError}</p>
              </div>
            </div>
          )}

          {isDownloading && (
            <div className="text-xs text-muted-foreground">
              Il download potrebbe richiedere alcuni minuti...
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
