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
  missingEmails: number;
  dbEmails: number;
  onStartDownload: () => Promise<void>;
  isDownloading: boolean;
  downloadedCount: number;
  downloadError: string | null;
}

export const EmailDownloadProgress = ({
  onDownloadComplete,
  totalEmails,
  missingEmails,
  dbEmails,
  onStartDownload,
  isDownloading,
  downloadedCount,
  downloadError,
}: EmailDownloadProgressProps) => {
  const progressPercentage = missingEmails > 0 ? (downloadedCount / missingEmails) * 100 : 0;
  const isComplete = downloadedCount >= missingEmails && missingEmails > 0;

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
              {downloadedCount.toLocaleString()} / {missingEmails.toLocaleString()}
            </span>
          ) : missingEmails > 0 ? (
            <span className="text-xs">{missingEmails.toLocaleString()} da scaricare</span>
          ) : (
            <span className="text-xs">Sincronizzato</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-1">Sincronizzazione Email</h4>
            <p className="text-sm text-muted-foreground">
              {dbEmails.toLocaleString()} nel DB, {totalEmails.toLocaleString()} totali
            </p>
            {missingEmails > 0 && (
              <p className="text-sm font-medium text-orange-600 dark:text-orange-400 mt-1">
                {missingEmails.toLocaleString()} email mancanti
              </p>
            )}
          </div>

          {!isDownloading && !isComplete && !downloadError && missingEmails > 0 && (
            <Button
              onClick={onStartDownload}
              className="w-full"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Scarica {missingEmails.toLocaleString()} email mancanti
            </Button>
          )}
          
          {!isDownloading && missingEmails === 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">
                Database sincronizzato
              </span>
            </div>
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
                <span>{missingEmails.toLocaleString()} mancanti</span>
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
