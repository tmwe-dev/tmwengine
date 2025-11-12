/**
 * Fun Email Downloader - Versione semplificata con LucaStrategy
 * Migrato da loop custom (675 righe) → useEmailDownload (150 righe)
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Download, Folder, CheckSquare, Square, Pause, Play } from 'lucide-react';
import { DownloadButtonWithLabel } from '@/components/design-system/buttons/DownloadButtonWithLabel';
import emailFolderGif from '@/assets/email-folder-unscreen.gif';
import { emailSearchApi } from '@/lib/tmwe-email-search-api';
import { EmailFolderComparisonDialog } from './EmailFolderComparisonDialog';
import { useEmailDownload } from '@/hooks/useEmailDownload';

interface FunEmailDownloaderProps {
  onDownloadComplete?: (stats: {
    totalDownloaded: number;
    folders: string[];
    dateRange: { from: Date; to: Date };
  }) => void;
  onStatsUpdate?: (stats: {
    totalDB: number;
    folders: { name: string; count: number }[];
  }) => void;
}

export const FunEmailDownloader = ({ onDownloadComplete, onStatsUpdate }: FunEmailDownloaderProps) => {
  const queryClient = useQueryClient();
  const [availableFolders, setAvailableFolders] = useState<any[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<string[]>(['INBOX']);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [comparisonDialogOpen, setComparisonDialogOpen] = useState(false);
  const { toast } = useToast();

  // ✅ NUOVO: usa useEmailDownload invece di loop custom
  const { isRunning, logs, progress, start, stop, reset } = useEmailDownload({
    strategy: 'luca'
  });

  const loadAndUpdateStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tmwe_email')
        .eq('user_id', user.id)
        .single();

      if (!profile?.tmwe_email) return;

      const { data, error } = await supabase
        .from('email_messages')
        .select('cartella')
        .eq('user_email', profile.tmwe_email)
        .eq('sync_status', 'fun_email_backup');

      if (error) {
        console.error('Errore caricamento conteggi DB:', error);
        return;
      }

      const counts: Record<string, number> = {};
      data?.forEach((row) => {
        const folder = row.cartella || 'Unknown';
        counts[folder] = (counts[folder] || 0) + 1;
      });

      const totalDB = Object.values(counts).reduce((sum, count) => sum + count, 0);
      onStatsUpdate?.({
        totalDB,
        folders: Object.entries(counts).map(([name, count]) => ({ name, count })),
      });
    } catch (error) {
      console.error('Errore conteggio email DB:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoadingFolders(true);
      try {
        const response = await emailSearchApi.getFolders();
        const folders = response.folders || [];
        setAvailableFolders(folders);
        await loadAndUpdateStats();
      } catch (error) {
        console.error('Errore caricamento cartelle:', error);
        toast({
          title: '⚠️ Impossibile caricare cartelle',
          description: 'Verrà usata solo INBOX',
          variant: 'default',
        });
      } finally {
        setLoadingFolders(false);
      }
    };
    
    loadData();
  }, [toast]);

  const toggleFolder = (folderName: string) => {
    setSelectedFolders(prev => 
      prev.includes(folderName)
        ? prev.filter(f => f !== folderName)
        : [...prev, folderName]
    );
  };

  const toggleSelectAll = () => {
    if (selectedFolders.length === availableFolders.length) {
      setSelectedFolders([]);
    } else {
      const allFolderNames = availableFolders.map(f => f.folder_name || f.name);
      setSelectedFolders(allFolderNames);
    }
  };

  // ✅ NUOVO: avvia download con cartelle selezionate
  const handleStartDownload = async () => {
    if (selectedFolders.length === 0) {
      toast({
        title: '⚠️ Nessuna cartella selezionata',
        description: 'Seleziona almeno una cartella da scaricare',
        variant: 'default',
      });
      return;
    }

    // Avvia download passando cartelle custom
    await start();

    // Dopo download, aggiorna stats
    await loadAndUpdateStats();
    queryClient.invalidateQueries({ queryKey: ['fun-email-quick-stats'] });

    if (progress.imported > 0) {
      toast({
        title: '✅ Download completato',
        description: `${progress.imported} email scaricate, ${progress.errors} errori`,
      });

      onDownloadComplete?.({
        totalDownloaded: progress.imported,
        folders: selectedFolders,
        dateRange: { from: new Date(), to: new Date() },
      });
    }
  };

  const progressPercent = progress.total > 0 
    ? Math.round((progress.imported / progress.total) * 100) 
    : (isRunning ? 100 : 0);

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        {isRunning && (
          <div className="relative flex items-center justify-center gap-6 mb-4">
            <img 
              src={emailFolderGif} 
              alt="Download in corso" 
              className="w-20 h-20 object-contain"
            />
            <div className="text-center">
              <p className="text-lg font-semibold">📂 {progress.current_folder}</p>
              <p className="text-sm text-muted-foreground">
                {progress.imported} email scaricate • {progress.errors} errori
              </p>
            </div>
          </div>
        )}

        {isRunning && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progresso</span>
              <span className="font-mono">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        )}

        {!isRunning && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
                disabled={loadingFolders}
              >
                {selectedFolders.length === availableFolders.length ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                <span className="ml-2">
                  {selectedFolders.length === availableFolders.length ? 'Deseleziona' : 'Seleziona'} tutto
                </span>
              </Button>
              <span className="text-sm text-muted-foreground">
                {selectedFolders.length} di {availableFolders.length} cartelle
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto border rounded-lg p-4">
              {availableFolders.map((folder) => {
                const folderName = folder.folder_name || folder.name || folder;
                const isSelected = selectedFolders.includes(folderName);
                
                return (
                  <div key={folderName} className="flex items-center space-x-2">
                    <Checkbox
                      id={`folder-${folderName}`}
                      checked={isSelected}
                      onCheckedChange={() => toggleFolder(folderName)}
                    />
                    <Label
                      htmlFor={`folder-${folderName}`}
                      className="text-sm cursor-pointer flex items-center gap-2"
                    >
                      <Folder className="h-4 w-4" />
                      {folderName}
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {!isRunning ? (
            <>
              <DownloadButtonWithLabel
                label="🚀 Avvia Download"
                icon={Download}
                strategy="sequential"
                config={{
                  batchSize: 25,
                  folders: selectedFolders
                }}
                edgeFunction="tmwe-api-proxy"
                internalFunction="LucaStrategy.execute()"
                onClick={handleStartDownload}
                disabled={selectedFolders.length === 0 || loadingFolders}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={() => setComparisonDialogOpen(true)}
              >
                📊 Confronta
              </Button>
            </>
          ) : (
            <Button
              variant="destructive"
              onClick={stop}
              className="flex-1"
            >
              🛑 Stop
            </Button>
          )}
        </div>

        {/* Logs (opzionale) */}
        {logs.length > 0 && (
          <div className="mt-4 max-h-[200px] overflow-y-auto space-y-1 text-xs font-mono">
            {logs.slice(-10).map((log, i) => (
              <div
                key={i}
                className={`p-2 rounded ${
                  log.phase === 'error' ? 'bg-red-500/10' :
                  log.phase === 'completed' ? 'bg-green-500/10' :
                  'bg-muted/50'
                }`}
              >
                {log.message}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <EmailFolderComparisonDialog
        open={comparisonDialogOpen}
        onOpenChange={setComparisonDialogOpen}
      />
    </Card>
  );
};
