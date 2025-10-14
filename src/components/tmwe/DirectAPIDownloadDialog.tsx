import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Download, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
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
    startDownload,
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
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
            <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm font-medium">
                  {currentFolder ? `Cartella: ${currentFolder}` : 'Inizializzazione...'}
                </span>
              </div>

              {totalToDownload > 0 && (
                <>
                  <Progress value={progress} className="h-2" />
                  <div className="text-xs text-muted-foreground text-center">
                    {downloadedCount} / {totalToDownload} email scaricate ({Math.round(progress)}%)
                  </div>
                </>
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
              <Button 
                variant="outline" 
                className="flex-1"
                disabled
              >
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Download in corso...
              </Button>
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
