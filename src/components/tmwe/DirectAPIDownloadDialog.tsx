import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Download, CheckCircle, AlertCircle, Loader2, Folder, Database, CloudDownload } from 'lucide-react';
import { useEmailDownload } from '@/hooks/useEmailDownload';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface DirectAPIDownloadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DirectAPIDownloadDialog = ({ open, onOpenChange }: DirectAPIDownloadDialogProps) => {
  const queryClient = useQueryClient();
  const {
    isDownloading,
    downloadedCount,
    downloadError,
    currentFolder,
    totalToDownload,
    currentFolderProgress,
    currentPhase,
    processedFolders,
    startDownload,
    stopDownload,
    reset
  } = useEmailDownload();

  const handleDownload = async () => {
    try {
      await startDownload(queryClient);
      toast.success('Download completato');
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    } catch (error: any) {
      toast.error(error.message || 'Errore durante il download');
    }
  };

  const handleClose = () => {
    if (!isDownloading) {
      reset();
      onOpenChange(false);
    }
  };

  const progress = totalToDownload > 0 ? (downloadedCount / totalToDownload) * 100 : 0;
  const folderProgress = currentFolderProgress.total > 0 
    ? (currentFolderProgress.current / currentFolderProgress.total) * 100 
    : 0;

  const getPhaseIcon = () => {
    switch (currentPhase) {
      case 'loading': return <CloudDownload className="h-5 w-5 text-blue-500" />;
      case 'downloading': return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
      case 'saving': return <Database className="h-5 w-5 text-green-500 animate-pulse" />;
      default: return <Folder className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getPhaseText = () => {
    switch (currentPhase) {
      case 'loading': return 'Caricamento cartelle...';
      case 'downloading': return 'Download in corso...';
      case 'saving': return 'Salvataggio nel database...';
      default: return 'In attesa...';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Scarica Email TMWE (API Diretta)</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Questo strumento scarica le email direttamente dal server TMWE usando l'API client-side. 
            Tutte le email verranno salvate nel database locale con body completo e allegati.
          </div>

          {/* Status Display */}
          {isDownloading && (
            <div className="space-y-4 bg-gradient-to-br from-primary/5 to-primary/10 p-5 rounded-lg border border-primary/20">
              {/* Fase corrente */}
              <div className="flex items-center gap-3">
                {getPhaseIcon()}
                <div className="flex-1">
                  <div className="text-sm font-semibold text-foreground">
                    {getPhaseText()}
                  </div>
                  {currentFolder && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      📂 {currentFolder}
                    </div>
                  )}
                </div>
              </div>

              {/* Progresso cartella corrente */}
              {currentFolderProgress.total > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-muted-foreground">Cartella corrente:</span>
                    <span className="font-bold text-foreground">
                      {currentFolderProgress.current} / {currentFolderProgress.total}
                    </span>
                  </div>
                  <Progress value={folderProgress} className="h-2 bg-muted" />
                </div>
              )}

              {/* Progresso totale */}
              {totalToDownload > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-muted-foreground">Progresso totale:</span>
                    <span className="font-bold text-primary">
                      {downloadedCount.toLocaleString()} / {totalToDownload.toLocaleString()} ({Math.round(progress)}%)
                    </span>
                  </div>
                  <Progress value={progress} className="h-3 bg-muted" />
                </div>
              )}

              {/* Cartelle processate (ultime 3) */}
              {processedFolders.length > 0 && (
                <div className="pt-2 border-t border-primary/10">
                  <div className="text-xs font-medium text-muted-foreground mb-1.5">
                    Cartelle completate:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {processedFolders.slice(-3).map((folder, idx) => (
                      <span 
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-700 dark:text-green-400 rounded text-xs"
                      >
                        <CheckCircle className="h-3 w-3" />
                        {folder}
                      </span>
                    ))}
                    {processedFolders.length > 3 && (
                      <span className="inline-flex items-center px-2 py-0.5 bg-muted text-muted-foreground rounded text-xs">
                        +{processedFolders.length - 3} altre
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Success Message */}
          {!isDownloading && downloadedCount > 0 && !downloadError && (
            <div className="flex items-center gap-2 p-4 bg-green-500/10 text-green-700 dark:text-green-400 rounded-lg">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">
                Download completato: {downloadedCount} email salvate
              </span>
            </div>
          )}

          {/* Error Message */}
          {downloadError && (
            <div className="flex items-start gap-2 p-4 bg-destructive/10 text-destructive rounded-lg">
              <AlertCircle className="h-5 w-5 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium">Errore durante il download</div>
                <div className="text-xs mt-1">{downloadError}</div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {!isDownloading ? (
              <>
                <Button 
                  onClick={handleDownload}
                  className="flex-1"
                  disabled={isDownloading}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Scarica Email
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleClose}
                >
                  Chiudi
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="destructive" 
                  onClick={stopDownload}
                  className="flex-1"
                >
                  Ferma Download
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleClose}
                  disabled
                >
                  Chiudi
                </Button>
              </>
            )}
          </div>

          {/* Info Footer */}
          <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded">
            <strong>Nota:</strong> Questo metodo scarica tutte le email da tutte le cartelle usando l'API TMWE. 
            Le email già presenti nel database verranno saltate automaticamente. 
            Il processo può richiedere alcuni minuti per account con molte email.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
