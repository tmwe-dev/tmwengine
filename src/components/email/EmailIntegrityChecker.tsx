import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { emailFolderApi } from '@/lib/tmwe-api-integrated';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RefreshCw, Loader2, Lock, LockOpen, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { getSyncPreferences, saveSyncPreferences } from '@/lib/email-sync-preferences';

interface FolderComparison {
  folderName: string;
  serverCount: number;
  dbCount: number;
  missing: number;
  syncPercentage: number;
}

interface EmailIntegrityCheckerProps {
  onRequestDownload?: (folderNames: string[]) => void;
}

export const EmailIntegrityChecker = ({ onRequestDownload }: EmailIntegrityCheckerProps) => {
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const [excludedFolders, setExcludedFolders] = useState<string[]>([]);
  const [isPerfectSyncing, setIsPerfectSyncing] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const toggleFolderSelection = (folderName: string) => {
    setSelectedFolders(prev => 
      prev.includes(folderName)
        ? prev.filter(f => f !== folderName)
        : [...prev, folderName]
    );
  };

  const toggleLock = async (folderName: string) => {
    if (!userEmail) return;
    
    const newExcluded = excludedFolders.includes(folderName)
      ? excludedFolders.filter(f => f !== folderName)
      : [...excludedFolders, folderName];
    
    setExcludedFolders(newExcluded);
    
    // Se cartella era selezionata, rimuovila
    if (selectedFolders.includes(folderName)) {
      setSelectedFolders(prev => prev.filter(f => f !== folderName));
    }
    
    try {
      await saveSyncPreferences(userEmail, {
        excluded_folders: newExcluded,
        included_folders: []
      });
      
      toast.success(
        excludedFolders.includes(folderName)
          ? `🔓 ${folderName} sbloccata`
          : `🔒 ${folderName} bloccata`
      );
    } catch (error: any) {
      console.error('Error saving lock preference:', error);
      toast.error('Errore salvataggio preferenze', {
        description: error.message
      });
      // Rollback
      setExcludedFolders(excludedFolders);
    }
  };

  const handlePerfectSync = async () => {
    setIsPerfectSyncing(true);
    
    try {
      toast.info(`🚀 Perfect Sync avviata`, {
        description: `Sincronizzazione di ${selectedFolders.length} cartelle...`
      });
      
      let totalSynced = 0;
      let successCount = 0;
      let errorCount = 0;
      
      for (const folder of selectedFolders) {
        console.log(`⚡ [PerfectSync] Syncing ${folder}...`);
        
        const { data, error } = await supabase.functions.invoke('tmwe-email-sync-master', {
          body: {
            mode: 'incremental',
            folder_name: folder,
            max_emails: 5000
          }
        });
        
        if (error) {
          console.error(`❌ [PerfectSync] Error syncing ${folder}:`, error);
          errorCount++;
          toast.error(`Errore sync ${folder}`, {
            description: error.message
          });
          continue;
        }
        
        const synced = data?.emails_downloaded || data?.synced_count || 0;
        totalSynced += synced;
        successCount++;
        console.log(`✅ [PerfectSync] ${folder}: ${synced} email scaricate`);
      }
      
      toast.success('✅ Perfect Sync completata!', {
        description: `${totalSynced} email scaricate in ${successCount} cartelle${errorCount > 0 ? ` (${errorCount} errori)` : ''}`
      });
      
      // Refresh tabella
      refetch();
      
      // Reset selezione
      setSelectedFolders([]);
      
    } catch (error: any) {
      console.error('❌ [PerfectSync] Fatal error:', error);
      toast.error('Errore Perfect Sync', {
        description: error.message
      });
    } finally {
      setIsPerfectSyncing(false);
    }
  };

  const { data: comparisons, isLoading, refetch, isRefetching, error, isSuccess } = useQuery<FolderComparison[], Error>({
    queryKey: ['email-integrity-check'],
    queryFn: async (): Promise<FolderComparison[]> => {
      console.log('🔍 [IntegrityCheck] Inizio verifica...');
      
      const { data: { user } } = await supabase.auth.getUser();
      console.log('🔍 [IntegrityCheck] User:', user?.id);
      
      if (!user) throw new Error('Non autenticato');

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tmwe_email')
        .eq('user_id', user.id)
        .single();
      
      console.log('🔍 [IntegrityCheck] Profile email:', profile?.tmwe_email);

      if (!profile?.tmwe_email) throw new Error('Email TMWE non configurata');

      // Salva email per uso nel toggleLock
      setUserEmail(profile.tmwe_email);

      // 1. Fetch conteggi server (usando emailFolderApi più affidabile)
      console.log('🔍 [IntegrityCheck] Fetching folders from server via emailFolderApi...');
      const serverFoldersResponse = await emailFolderApi.getFolders({ 
        include_counts: true,  // Include conteggi messaggi per cartella
        skipCache: true        // Salta cache per dati freschi
      });
      console.log('🔍 [IntegrityCheck] Server folders response:', serverFoldersResponse);
      console.log('🔍 [IntegrityCheck] Response keys:', Object.keys(serverFoldersResponse || {}));
      
      // La risposta potrebbe avere folders, data, o essere direttamente un array
      const serverFolders = serverFoldersResponse.folders 
        || serverFoldersResponse.data 
        || (Array.isArray(serverFoldersResponse) ? serverFoldersResponse : []);
      
      console.log('🔍 [IntegrityCheck] Extracted server folders:', serverFolders);
      console.log('🔍 [IntegrityCheck] Server folders count:', serverFolders.length);
      
      if (serverFolders.length > 0) {
        console.log('🔍 [IntegrityCheck] First folder structure:', serverFolders[0]);
      }

      // 2. Fetch conteggi DB locale
      console.log('🔍 [IntegrityCheck] Fetching DB counts...');
      const { data: dbCounts, error: dbError } = await supabase.rpc('get_email_folder_counts', {
        p_user_email: profile.tmwe_email,
        p_sync_status: 'fun_email_backup'
      });
      
      console.log('🔍 [IntegrityCheck] DB counts:', dbCounts);
      if (dbError) console.error('🔍 [IntegrityCheck] DB error:', dbError);

      const dbCountsMap = (dbCounts || []).reduce((acc: Record<string, number>, row: { cartella: string; count: number }) => {
        acc[row.cartella] = row.count;
        return acc;
      }, {});

      // 3. Confronta e crea risultati
      const results: FolderComparison[] = serverFolders.map((folder: any) => {
        // emailFolderApi restituisce: { name, display_name?, total_count?, message_count?, unread_count? }
        const folderName = folder.name || folder.folder;
        const serverCount = folder.message_count || folder.total_count || folder.messages || folder.count || folder.total || 0;
        const dbCount = dbCountsMap[folderName] || 0;
        const missing = Math.max(0, serverCount - dbCount);
        const syncPercentage = serverCount > 0 
          ? Math.round((dbCount / serverCount) * 100) 
          : 100;

        console.log(`🔍 [IntegrityCheck] Folder "${folderName}": server=${serverCount}, db=${dbCount}, missing=${missing}`);

        return {
          folderName,
          serverCount,
          dbCount,
          missing,
          syncPercentage
        };
      });

      console.log('🔍 [IntegrityCheck] Results:', results);
      return results;
    },
    enabled: true,
    refetchInterval: false,
    retry: 2
  });

  // Gestione toast per errori e successo
  useEffect(() => {
    if (error) {
      console.error('🔍 [IntegrityCheck] Query error:', error);
      toast.error('Errore verifica integrità', {
        description: error.message || 'Impossibile contattare il server'
      });
    }
  }, [error]);

  useEffect(() => {
    if (isSuccess && comparisons) {
      console.log('🔍 [IntegrityCheck] Query success!');
      toast.success('Verifica completata');
    }
  }, [isSuccess, comparisons]);

  // Carica preferenze sincronizzazione
  useEffect(() => {
    const loadPreferences = async () => {
      if (!userEmail) return;
      
      try {
        const prefs = await getSyncPreferences(userEmail);
        setExcludedFolders(prefs.excluded_folders);
        console.log('🔒 [IntegrityCheck] Loaded excluded folders:', prefs.excluded_folders);
      } catch (error) {
        console.error('Error loading sync preferences:', error);
      }
    };
    
    loadPreferences();
  }, [userEmail]);

  const totalServer = comparisons?.reduce((sum, c) => sum + c.serverCount, 0) || 0;
  const totalDB = comparisons?.reduce((sum, c) => sum + c.dbCount, 0) || 0;
  const totalMissing = comparisons?.reduce((sum, c) => sum + c.missing, 0) || 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>🔍 Verifica Integrità Email</CardTitle>
          <Button
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            size="sm"
          >
            {(isLoading || isRefetching) ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Verifica Ora
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Riepilogo Globale */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Totale Server</p>
            <p className="text-2xl font-bold">{totalServer}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Totale DB Locale</p>
            <p className="text-2xl font-bold">{totalDB}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Email Mancanti</p>
            <p className={`text-2xl font-bold ${totalMissing > 0 ? 'text-destructive' : 'text-green-500'}`}>
              {totalMissing}
            </p>
          </div>
        </div>

        {/* Mostra errore se presente */}
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
            <p className="text-sm text-destructive font-semibold">
              ⚠️ Errore durante la verifica
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {(error as Error).message}
            </p>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => refetch()} 
              className="mt-2"
            >
              🔄 Riprova
            </Button>
          </div>
        )}

        {/* Tabella Comparazione Cartelle */}
        {isLoading || isRefetching ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-2">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {isLoading ? 'Connessione al server TMWE...' : 'Aggiornamento dati...'}
            </p>
          </div>
        ) : comparisons && comparisons.length > 0 ? (
          <>
            {/* Bottoni Controllo Selezione */}
            <div className="flex gap-2 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const allWithMissing = comparisons
                    .filter(c => c.missing > 0 && !excludedFolders.includes(c.folderName))
                    .map(c => c.folderName);
                  setSelectedFolders(allWithMissing);
                }}
              >
                ✅ Seleziona tutte con email mancanti
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedFolders([])}
                disabled={selectedFolders.length === 0}
              >
                ❌ Deseleziona tutto
              </Button>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">🔒</TableHead>
                    <TableHead>Cartella</TableHead>
                    <TableHead className="text-right">Server</TableHead>
                    <TableHead className="text-right">DB Locale</TableHead>
                    <TableHead className="text-right">Mancanti</TableHead>
                    <TableHead className="text-center">% Sync</TableHead>
                    <TableHead className="text-center">Seleziona</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparisons.map(comp => (
                    <TableRow key={comp.folderName}>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleLock(comp.folderName)}
                          className="h-8 w-8"
                        >
                          {excludedFolders.includes(comp.folderName) ? (
                            <Lock className="h-4 w-4 text-destructive" />
                          ) : (
                            <LockOpen className="h-4 w-4 text-green-500" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">{comp.folderName}</TableCell>
                      <TableCell className="text-right">{comp.serverCount}</TableCell>
                      <TableCell className="text-right">{comp.dbCount}</TableCell>
                      <TableCell className={`text-right ${comp.missing > 0 ? 'text-destructive font-semibold' : 'text-green-500'}`}>
                        {comp.missing}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={comp.syncPercentage === 100 ? 'default' : 'secondary'}>
                          {comp.syncPercentage}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {comp.missing > 0 ? (
                          excludedFolders.includes(comp.folderName) ? (
                            <span className="text-xs text-muted-foreground">🔒 Bloccata</span>
                          ) : (
                            <Checkbox
                              checked={selectedFolders.includes(comp.folderName)}
                              onCheckedChange={() => toggleFolderSelection(comp.folderName)}
                            />
                          )
                        ) : (
                          <span className="text-xs text-green-500">✓ Completo</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Bottone Conferma */}
            <div className="mt-6 flex items-center justify-between border-t pt-4">
              <div className="text-sm text-muted-foreground">
                {selectedFolders.length > 0 
                  ? `${selectedFolders.length} cartelle selezionate`
                  : 'Seleziona le cartelle da scaricare con i checkbox'
                }
              </div>
              
              <Button
                onClick={handlePerfectSync}
                disabled={selectedFolders.length === 0 || isPerfectSyncing}
                size="lg"
                className="gap-2"
              >
                {isPerfectSyncing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Sincronizzazione...</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    <span>Perfect Sync</span>
                    {selectedFolders.length > 0 && (
                      <span className="bg-primary-foreground text-primary rounded-full px-2 py-0.5 text-xs font-bold">
                        {selectedFolders.length}
                      </span>
                    )}
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            Nessuna cartella trovata.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
