import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Download, CheckCircle, AlertCircle, Loader2, Folder, Database, CloudDownload, ArrowRight } from 'lucide-react';
import { useEmailDownload } from '@/hooks/useEmailDownload';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { EmailSyncPreferences } from './EmailSyncPreferences';
import { supabase } from '@/integrations/supabase/client';
import { getSyncPreferences, filterFolders, getFilterStats } from '@/lib/email-sync-preferences';
import { emailFolderApi } from '@/lib/tmwe-api-integrated';

interface DirectAPIDownloadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DirectAPIDownloadDialog = ({ open, onOpenChange }: DirectAPIDownloadDialogProps) => {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<'config' | 'download'>('config');
  const [userEmail, setUserEmail] = useState<string>('');
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

  // Fetch user email when dialog opens
  useEffect(() => {
    if (open) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          supabase
            .from('user_profiles')
            .select('tmwe_email')
            .eq('user_id', user.id)
            .single()
            .then(({ data }) => {
              if (data?.tmwe_email) {
                setUserEmail(data.tmwe_email);
              }
            });
        }
      });
    }
  }, [open]);

  // Fetch folders and preferences for preview
  const { data: foldersData } = useQuery({
    queryKey: ['folders', userEmail],
    queryFn: emailFolderApi.getFolders,
    enabled: !!userEmail && step === 'config',
  });

  const { data: syncPreferences } = useQuery({
    queryKey: ['sync-preferences', userEmail],
    queryFn: () => getSyncPreferences(userEmail),
    enabled: !!userEmail && step === 'config',
  });

  const allFolders = foldersData?.data || [];
  const filteredFolders = syncPreferences ? filterFolders(allFolders, syncPreferences) : [];
  const filterStats = syncPreferences ? getFilterStats(allFolders.length, filteredFolders, syncPreferences) : null;

  const handleStartDownload = async () => {
    setStep('download');
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
      setStep('config');
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'config' ? 'Configura Download Email' : 'Download Email TMWE'}
          </DialogTitle>
        </DialogHeader>

        {step === 'config' ? (
          /* CONFIG STEP */
          <div className="space-y-6">
            {userEmail ? (
              <>
                <EmailSyncPreferences 
                  userEmail={userEmail} 
                  showButtons={false}
                />

                {/* Preview cartelle */}
                {filterStats && (
                  <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
                    <div className="font-medium text-sm">📊 Riepilogo Download</div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>
                          <strong>{filterStats.filtered}</strong> cartelle da scaricare
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                        <span>
                          <strong>{filterStats.excluded}</strong> cartelle escluse
                        </span>
                      </div>
                    </div>
                    
                    {filteredFolders.length > 0 && (
                      <div className="pt-2 border-t">
                        <div className="text-xs font-medium text-muted-foreground mb-2">
                          Cartelle che verranno scaricate:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {filteredFolders.slice(0, 5).map((folder: any) => (
                            <span 
                              key={folder.name}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-xs"
                            >
                              <Folder className="h-3 w-3" />
                              {folder.name}
                              {folder.messages > 0 && (
                                <span className="text-muted-foreground">({folder.messages})</span>
                              )}
                            </span>
                          ))}
                          {filteredFolders.length > 5 && (
                            <span className="inline-flex items-center px-2 py-1 bg-muted text-muted-foreground rounded text-xs">
                              +{filteredFolders.length - 5} altre
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={handleClose}>
                    Annulla
                  </Button>
                  <Button onClick={handleStartDownload} disabled={filteredFolders.length === 0}>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Avvia Download
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </div>
        ) : (
          /* DOWNLOAD STEP */
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Download in corso dal server TMWE. Le email verranno salvate nel database locale.
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
                <Button 
                  variant="outline" 
                  onClick={handleClose}
                  className="flex-1"
                >
                  Chiudi
                </Button>
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
              <strong>Nota:</strong> Le email già presenti nel database verranno saltate automaticamente. 
              Il processo può richiedere alcuni minuti per account con molte email.
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
