import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, CheckCircle2, AlertCircle, Loader2, Database, ArrowRight, Info } from 'lucide-react';
import { useEmailDownload } from '@/hooks/useEmailDownload';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { EmailSyncPreferences } from './EmailSyncPreferences';
import { supabase } from '@/integrations/supabase/client';
import { getSyncPreferences, filterFolders } from '@/lib/email-sync-preferences';
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
  const excludedFoldersCount = allFolders.length - filteredFolders.length;

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


  const downloadState = {
    phase: isDownloading ? currentPhase : downloadError ? 'error' : downloadedCount > 0 ? 'completed' : 'idle',
    currentFolder,
    currentFolderProcessed: currentFolderProgress.current,
    currentFolderTotal: currentFolderProgress.total,
    completedFolders: processedFolders.length,
    totalFolders: totalToDownload > 0 ? Math.ceil(totalToDownload / 100) : 0,
    recentFolders: processedFolders.slice(-3).map((name, idx) => ({ name, count: 0 })),
    error: downloadError
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {step === 'config' ? 'Configura Download Email' : 'Download Email in Corso'}
          </DialogTitle>
        </DialogHeader>

        <Separator className="bg-border/30" />

        <div className="flex-1 overflow-y-auto min-h-0">
          {step === 'config' ? (
            <div className="space-y-3 px-1">
            <EmailSyncPreferences
              userEmail={userEmail || ''}
              onClose={() => onOpenChange(false)}
              showButtons={false}
            />

            <Separator className="bg-border/30" />

            <div className="space-y-3 py-2">
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span className="font-medium">{filteredFolders.length} {filteredFolders.length === 1 ? 'cartella' : 'cartelle'}</span>
                </span>
                {excludedFoldersCount > 0 && (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <AlertCircle className="h-4 w-4" />
                    <span>{excludedFoldersCount} {excludedFoldersCount === 1 ? 'esclusa' : 'escluse'}</span>
                  </span>
                )}
              </div>
              
              {filteredFolders.length > 0 && (
                <div className="flex flex-wrap gap-1.5 animate-fade-in">
                  {filteredFolders.slice(0, 8).map((folder: any) => (
                    <Badge key={folder.name} variant="outline" className="text-xs font-normal">
                      {folder.name}
                    </Badge>
                  ))}
                  {filteredFolders.length > 8 && (
                    <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                      +{filteredFolders.length - 8}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <Separator className="bg-border/30" />
            </div>
          ) : (
            <div className="space-y-3 px-1">
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {downloadState.phase === 'loading' && (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  )}
                  {downloadState.phase === 'downloading' && (
                    <Download className="h-5 w-5 text-primary" />
                  )}
                  {downloadState.phase === 'saving' && (
                    <Database className="h-5 w-5 text-primary" />
                  )}
                  {downloadState.phase === 'completed' && (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  )}
                  {downloadState.phase === 'error' && (
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  )}
                  <div>
                    <div className="font-medium">
                      {downloadState.phase === 'loading' && 'Caricamento cartelle...'}
                      {downloadState.phase === 'downloading' && `Scaricamento ${downloadState.currentFolder}...`}
                      {downloadState.phase === 'saving' && 'Salvataggio messaggi...'}
                      {downloadState.phase === 'completed' && 'Download completato!'}
                      {downloadState.phase === 'error' && 'Errore durante il download'}
                    </div>
                    {downloadState.currentFolder && downloadState.phase !== 'completed' && (
                      <div className="text-sm text-muted-foreground">
                        {downloadState.currentFolder}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Separator className="bg-border/30" />

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Cartella corrente</span>
                    <span className="font-medium">
                      {downloadState.currentFolderProcessed}/{downloadState.currentFolderTotal}
                    </span>
                  </div>
                  <Progress 
                    value={downloadState.currentFolderTotal > 0 
                      ? (downloadState.currentFolderProcessed / downloadState.currentFolderTotal) * 100 
                      : 0
                    } 
                    className="h-1.5"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progresso totale</span>
                    <span className="font-medium">
                      {downloadState.completedFolders}/{downloadState.totalFolders} cartelle
                    </span>
                  </div>
                  <Progress 
                    value={downloadState.totalFolders > 0 
                      ? (downloadState.completedFolders / downloadState.totalFolders) * 100 
                      : 0
                    } 
                    className="h-1.5"
                  />
                </div>
              </div>
            </div>

            {downloadState.recentFolders.length > 0 && (
              <>
                <Separator className="bg-border/30" />
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">Completate:</div>
                  <div className="space-y-1">
                    {downloadState.recentFolders.map((folder, index) => (
                      <div 
                        key={index}
                        className="flex items-center gap-2 text-xs text-muted-foreground animate-fade-in"
                      >
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                        <span>{folder.name}</span>
                        <span className="text-[10px]">({folder.count})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {downloadState.phase === 'completed' && (
              <>
                <Separator className="bg-border/30" />
                <div className="flex items-start gap-3 text-sm animate-fade-in">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                  <div>
                    <div className="font-medium">Download completato</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Tutte le email sono state salvate nel database
                    </div>
                  </div>
                </div>
              </>
            )}

            {downloadState.phase === 'error' && downloadState.error && (
              <>
                <Separator className="bg-border/30" />
                <div className="flex items-start gap-3 text-sm animate-fade-in">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                  <div>
                    <div className="font-medium text-destructive">Errore</div>
                    <div className="text-xs text-destructive/90 mt-0.5">
                      {downloadState.error}
                    </div>
                  </div>
                </div>
              </>
            )}

            <Separator className="bg-border/30" />

            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>Le email già presenti verranno saltate automaticamente.</span>
            </div>
          </div>
          )}
        </div>

        <Separator className="bg-border/30" />

        <DialogFooter>
          {step === 'config' ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Annulla
              </Button>
              <Button 
                onClick={handleStartDownload}
                disabled={filteredFolders.length === 0}
              >
                Avvia Download
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          ) : downloadState.phase !== 'completed' && downloadState.phase !== 'error' ? (
            <Button 
              variant="destructive" 
              onClick={stopDownload}
            >
              Ferma Download
            </Button>
          ) : (
            <Button onClick={handleClose}>
              Chiudi
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
