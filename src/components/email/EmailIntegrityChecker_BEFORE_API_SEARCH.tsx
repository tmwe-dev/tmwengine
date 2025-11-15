import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { emailFolderApi } from '@/lib/tmwe-api-integrated';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface FolderComparison {
  folderName: string;
  serverCount: number;
  dbCount: number;
  missing: number;
  syncPercentage: number;
}

interface EmailIntegrityCheckerProps {
  onRequestDownload?: (folderNames: string[]) => void;
  isDownloadActive?: boolean;
}

export const EmailIntegrityChecker = ({ onRequestDownload, isDownloadActive = false }: EmailIntegrityCheckerProps) => {
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);

  const toggleFolderSelection = (folderName: string) => {
    setSelectedFolders(prev => 
      prev.includes(folderName)
        ? prev.filter(f => f !== folderName)
        : [...prev, folderName]
    );
  };

  const { data: comparisons, isLoading, refetch, isRefetching, error, isSuccess } = useQuery<FolderComparison[], Error>({
    queryKey: ['email-integrity-check'],
    queryFn: async (): Promise<FolderComparison[]> => {
      console.log('🔍 [IntegrityCheck] Using unified count service...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non autenticato');

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tmwe_email')
        .eq('user_id', user.id)
        .single();

      if (!profile?.tmwe_email) throw new Error('Email TMWE non configurata');

      // ✅ USA SERVIZIO UNIFICATO
      const { getUnifiedFolderCounts } = await import('@/lib/email-count-service');
      const unifiedResults = await getUnifiedFolderCounts(profile.tmwe_email);
      
      // Converti in formato FolderComparison
      return unifiedResults.map(r => ({
        folderName: r.folderName,
        serverCount: r.serverCount >= 0 ? r.serverCount : 0,
        dbCount: r.dbCount,
        missing: r.missing,
        syncPercentage: r.syncPercentage
      }));
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

  const totalServer = comparisons?.reduce((sum, c) => sum + c.serverCount, 0) || 0;
  const totalDB = comparisons?.reduce((sum, c) => sum + c.dbCount, 0) || 0;
  const totalMissing = comparisons?.reduce((sum, c) => sum + c.missing, 0) || 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>🔍 Verifica Integrità Email</CardTitle>
            {isDownloadActive && (
              <Badge variant="outline" className="animate-pulse">
                🔄 Auto-aggiornamento attivo
              </Badge>
            )}
          </div>
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
                    .filter(c => c.missing > 0)
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
                          <Checkbox
                            checked={selectedFolders.includes(comp.folderName)}
                            onCheckedChange={() => toggleFolderSelection(comp.folderName)}
                          />
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
                onClick={() => {
                  if (onRequestDownload) {
                    console.log('🔍 [IntegrityCheck] Passing folders to Quick:', selectedFolders);
                    onRequestDownload(selectedFolders);
                    toast.success('🚀 Redirect a Quick Download', {
                      description: `Preparazione download di ${selectedFolders.length} cartelle...`
                    });
                  }
                }}
                disabled={selectedFolders.length === 0}
                size="lg"
                className="gap-2"
              >
                <span>🚀 Vai a Quick Download</span>
                {selectedFolders.length > 0 && (
                  <span className="bg-primary-foreground text-primary rounded-full px-2 py-0.5 text-xs font-bold">
                    {selectedFolders.length}
                  </span>
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
