import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { emailSearchApi } from '@/lib/tmwe-email-search-api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CloudDownload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { QuickEmailSyncer } from '@/lib/email-sync-quick';

interface FolderComparison {
  folderName: string;
  serverCount: number;
  dbCount: number;
  missing: number;
  syncPercentage: number;
}

export const EmailIntegrityChecker = () => {
  const [isReDownloading, setIsReDownloading] = useState<string | null>(null);

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

      // 1. Fetch conteggi server
      console.log('🔍 [IntegrityCheck] Fetching folders from server...');
      const serverFoldersResponse = await emailSearchApi.getFolders();
      console.log('🔍 [IntegrityCheck] Server folders response:', serverFoldersResponse);
      
      const serverFolders = serverFoldersResponse.data || [];
      console.log('🔍 [IntegrityCheck] Server folders count:', serverFolders.length);

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
      const results: FolderComparison[] = serverFolders.map(folder => {
        const serverCount = folder.messages || 0;
        const dbCount = dbCountsMap[folder.name] || 0;
        const missing = Math.max(0, serverCount - dbCount);
        const syncPercentage = serverCount > 0 ? Math.round((dbCount / serverCount) * 100) : 100;

        return {
          folderName: folder.name,
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

  const handleReDownload = async (folderName: string) => {
    try {
      setIsReDownloading(folderName);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non autenticato');

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tmwe_email')
        .eq('user_id', user.id)
        .single();

      if (!profile?.tmwe_email) throw new Error('Email TMWE non configurata');

      toast.info(`Download in corso per ${folderName}...`);

      const syncer = new QuickEmailSyncer({
        folders: [folderName],
        userEmail: profile.tmwe_email,
        onComplete: (stats) => {
          toast.success(`${stats.totalDownloaded} email scaricate da ${folderName}`);
          refetch();
          setIsReDownloading(null);
        },
        onError: (error) => {
          toast.error(`Errore download ${folderName}: ${error.message}`);
          setIsReDownloading(null);
        }
      });

      await syncer.start();
    } catch (error: any) {
      toast.error(`Errore: ${error.message}`);
      setIsReDownloading(null);
    }
  };

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
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cartella</TableHead>
                  <TableHead className="text-right">Server</TableHead>
                  <TableHead className="text-right">DB Locale</TableHead>
                  <TableHead className="text-right">Mancanti</TableHead>
                  <TableHead className="text-center">% Sync</TableHead>
                  <TableHead className="text-center">Azione</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisons.map(comp => (
                  <TableRow key={comp.folderName}>
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
                        <Button
                          size="sm"
                          onClick={() => handleReDownload(comp.folderName)}
                          disabled={isReDownloading === comp.folderName}
                          variant="outline"
                        >
                          {isReDownloading === comp.folderName ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <CloudDownload className="h-3 w-3 mr-1" />
                          )}
                          Scarica {comp.missing}
                        </Button>
                      ) : (
                        <span className="text-xs text-green-500">✓ Completo</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            Nessuna cartella trovata.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
