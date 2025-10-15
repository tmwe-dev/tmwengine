import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Loader2, ArrowRight, Info, CheckCircle2 } from 'lucide-react';
import { useEmailDownloadOptimized } from '@/hooks/useEmailDownloadOptimized';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getSyncPreferences, filterFolders } from '@/lib/email-sync-preferences';
import { emailFolderApi } from '@/lib/tmwe-api-integrated';
import { useEmailStats } from '@/hooks/useEmailStats';
import { FolderStatsTable } from './FolderStatsTable';
import { Checkbox } from '@/components/ui/checkbox';

interface DirectAPIDownloadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DirectAPIDownloadDialog = ({ open, onOpenChange }: DirectAPIDownloadDialogProps) => {
  const queryClient = useQueryClient();
  const [userEmail, setUserEmail] = useState<string>('');
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const hasInitialized = useRef(false);
  
  const {
    isDownloading,
    startDownload,
    stopDownload,
    reset,
    resumeDownload,
    folderProgress,
    downloadStats,
    hasCache,
  } = useEmailDownloadOptimized();

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

  // Fetch folders (usando getAllFoldersRecursive per cartelle complete)
  const { data: foldersData, isLoading: foldersLoading } = useQuery({
    queryKey: ['folders-recursive', userEmail],
    queryFn: emailFolderApi.getAllFoldersRecursive,
    enabled: !!userEmail && open,
  });

  // Fetch sync preferences
  const { data: syncPreferences } = useQuery({
    queryKey: ['sync-preferences', userEmail],
    queryFn: () => getSyncPreferences(userEmail),
    enabled: !!userEmail && open,
  });

  const allFolders = (foldersData as any)?.data || [];

  // Inizializza selectedFolders basandosi sulle preferenze
  useEffect(() => {
    if (syncPreferences && allFolders.length > 0 && !hasInitialized.current) {
      const filtered = filterFolders(allFolders, syncPreferences);
      setSelectedFolders(filtered.map(f => f.name));
      hasInitialized.current = true;
      console.log(`📂 Cartelle selezionate inizialmente:`, filtered.map(f => f.name));
    }
  }, [syncPreferences, allFolders]);

  // Fetch statistics
  const { data: stats = [], refetch: refetchStats } = useEmailStats(allFolders, userEmail);

  // Refetch stats ogni 3 secondi durante il download
  useEffect(() => {
    if (isDownloading) {
      const interval = setInterval(() => {
        refetchStats();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isDownloading, refetchStats]);

  const handleToggle = (folderName: string) => {
    setSelectedFolders(prev => 
      prev.includes(folderName)
        ? prev.filter(f => f !== folderName)
        : [...prev, folderName]
    );
  };

  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedFolders(allFolders.map(f => f.name));
    } else {
      setSelectedFolders([]);
    }
  };

  const handleStartDownload = async () => {
    if (selectedFolders.length === 0) {
      toast.error('Seleziona almeno una cartella');
      return;
    }

    try {
      await startDownload(selectedFolders, queryClient);
      toast.success('Download completato');
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      refetchStats();
    } catch (error: any) {
      toast.error(error.message || 'Errore durante il download');
    }
  };

  const handleClose = () => {
    if (!isDownloading) {
      reset();
      setSelectedFolders([]);
      hasInitialized.current = false;
      onOpenChange(false);
    }
  };

  const selectedStats = stats.filter(s => selectedFolders.includes(s.folder));
  const totalMissing = selectedStats.reduce((sum, s) => sum + s.missing, 0);
  const allSelected = allFolders.length > 0 && selectedFolders.length === allFolders.length;
  const someSelected = selectedFolders.length > 0 && selectedFolders.length < allFolders.length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl lg:h-[85vh] h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between text-xl">
            <span>{isDownloading ? 'Download Email in Corso' : 'Configura Download Email'}</span>
            {isDownloading && downloadStats.avgSpeed > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                ⚡ {downloadStats.avgSpeed.toFixed(1)} email/sec
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0">
          {foldersLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Caricamento cartelle...</span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleToggleAll}
                    disabled={isDownloading}
                    ref={(el) => {
                      if (el) {
                        // @ts-ignore
                        el.indeterminate = someSelected;
                      }
                    }}
                  />
                  <span className="text-sm font-medium">
                    Seleziona tutte ({allFolders.length})
                  </span>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>
                      {selectedFolders.length} {selectedFolders.length === 1 ? 'cartella' : 'cartelle'} selezionate
                    </span>
                  </div>
                  {totalMissing > 0 && (
                    <div className="flex items-center gap-2">
                      <Download className="h-4 w-4 text-destructive" />
                      <span className="text-destructive font-medium">
                        {totalMissing.toLocaleString()} email da scaricare
                      </span>
                    </div>
                  )}
                  {isDownloading && downloadStats.totalEmails > 0 && (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>
                        {downloadStats.downloadedEmails}/{downloadStats.totalEmails} ({Math.round((downloadStats.downloadedEmails / downloadStats.totalEmails) * 100)}%)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <FolderStatsTable
                folders={allFolders}
                stats={stats}
                selectedFolders={selectedFolders}
                onToggle={handleToggle}
                isDownloading={isDownloading}
                folderProgress={folderProgress}
              />

              <div className="flex items-start gap-2 text-xs text-muted-foreground pt-2 border-t">
                <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>
                  Le cartelle al 98%+ di sincronizzazione verranno saltate automaticamente. 
                  Le email già presenti non verranno scaricate nuovamente.
                </span>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="border-t pt-3 gap-2">
          {hasCache && !isDownloading && (
            <Button
              variant="secondary"
              onClick={() => resumeDownload(selectedFolders, queryClient)}
              className="mr-auto"
            >
              Riprendi Download
            </Button>
          )}
          {!isDownloading ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Annulla
              </Button>
              <Button 
                onClick={handleStartDownload}
                disabled={selectedFolders.length === 0 || totalMissing === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Download Veloce ⚡ {totalMissing > 0 ? `(${totalMissing.toLocaleString()} email)` : ''}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isDownloading}>
                Chiudi
              </Button>
              <Button 
                variant="destructive" 
                onClick={stopDownload}
              >
                Ferma Download
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
