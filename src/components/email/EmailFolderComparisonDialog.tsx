import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { emailSearchApi } from '@/lib/tmwe-email-search-api';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface FolderComparison {
  folderName: string;
  localMaxUid: number | null;
  serverMaxUid: number | null;
  difference: number;
  status: 'sync' | 'behind' | 'missing' | 'unknown';
}

interface EmailFolderComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectFolder?: (folderName: string) => void;
}

export function EmailFolderComparisonDialog({
  open,
  onOpenChange,
  onSelectFolder
}: EmailFolderComparisonDialogProps) {
  const [comparisons, setComparisons] = useState<FolderComparison[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const { toast } = useToast();

  const fetchComparison = async () => {
    setLoading(true);
    setProgress('Recupero dati utente...');
    
    try {
      // Recupera email utente
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        throw new Error('Utente non autenticato');
      }

      const userEmail = user.email;

      // A. Recupero cartelle locali con MAX UID
      setProgress('Analisi cartelle locali...');
      const { data: localMessages } = await supabase
        .from('email_messages')
        .select('cartella, message_id')
        .eq('user_email', userEmail)
        .eq('sync_status', 'fun_email_backup');

      const localMaxUids: Record<string, number> = {};
      localMessages?.forEach(row => {
        const parts = row.message_id.split('/');
        if (parts.length === 2) {
          const folder = parts[0];
          const uid = parseInt(parts[1], 10);
          if (!isNaN(uid)) {
            localMaxUids[folder] = Math.max(localMaxUids[folder] || 0, uid);
          }
        }
      });

      // B. Recupero cartelle server
      setProgress('Recupero cartelle dal server...');
      const foldersResponse = await emailSearchApi.getFolders({ timeout: 15000 });
      const serverFolders = foldersResponse.folders || [];

      // C. Per ogni cartella server, ottieni info dettagliate
      const serverData: Record<string, { total: number; maxUid: number }> = {};
      
      for (let i = 0; i < serverFolders.length; i++) {
        const folder = serverFolders[i];
        const folderName = folder.folder_name || folder.name;
        
        setProgress(`Recupero info ${folderName} (${i + 1}/${serverFolders.length})...`);
        
        try {
          const folderInfo = await emailSearchApi.getFolderInfo(folderName, 10000);
          
          serverData[folderName] = {
            total: folderInfo.message_count || folderInfo.total || 0,
            maxUid: folderInfo.max_uid || folderInfo.uidnext || 0
          };
        } catch (error) {
          console.error(`Errore recupero info ${folderName}:`, error);
          serverData[folderName] = { total: 0, maxUid: 0 };
        }
      }

      // D. Calcolo comparazione
      setProgress('Calcolo differenze...');
      const allFolders = new Set([
        ...Object.keys(localMaxUids),
        ...Object.keys(serverData)
      ]);

      const results: FolderComparison[] = [];
      allFolders.forEach(folderName => {
        const localMax = localMaxUids[folderName] || null;
        const serverMax = serverData[folderName]?.maxUid || null;
        
        let difference = 0;
        let status: 'sync' | 'behind' | 'missing' | 'unknown' = 'unknown';
        
        if (localMax === null && serverMax !== null) {
          status = 'missing';
          difference = serverMax;
        } else if (localMax !== null && serverMax !== null) {
          difference = Math.max(0, serverMax - localMax);
          status = difference === 0 ? 'sync' : 'behind';
        }
        
        results.push({
          folderName,
          localMaxUid: localMax,
          serverMaxUid: serverMax,
          difference,
          status
        });
      });

      results.sort((a, b) => b.difference - a.difference);
      setComparisons(results);
      setProgress('');
      
      toast({
        title: '✅ Verifica completata',
        description: `${results.length} cartelle analizzate`
      });
      
    } catch (error: any) {
      console.error('Errore verifica sincronizzazione:', error);
      toast({
        title: '❌ Errore verifica',
        description: error.message,
        variant: 'destructive'
      });
      setProgress('');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (newOpen && comparisons.length === 0) {
      fetchComparison();
    }
  };

  const getStatusBadge = (comparison: FolderComparison) => {
    switch (comparison.status) {
      case 'sync':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">✅ Sincronizzato</Badge>;
      case 'behind':
        return <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20">📬 {comparison.difference} nuove</Badge>;
      case 'missing':
        return <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20">📥 {comparison.difference} (mai scaricata)</Badge>;
      default:
        return <Badge variant="outline">⚠️ Sconosciuto</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>🔍 Verifica Sincronizzazione Cartelle</DialogTitle>
          <DialogDescription>
            Confronto tra cartelle locali e server TMWE
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{progress}</p>
          </div>
        ) : comparisons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <p className="text-sm text-muted-foreground">Nessun dato disponibile</p>
            <Button onClick={fetchComparison}>Avvia Verifica</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cartella</TableHead>
                    <TableHead className="text-right">UID Locale</TableHead>
                    <TableHead className="text-right">UID Server</TableHead>
                    <TableHead className="text-right">Nuovi Server</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparisons.map((comparison) => (
                    <TableRow 
                      key={comparison.folderName}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        if (comparison.difference > 0 && onSelectFolder) {
                          onSelectFolder(comparison.folderName);
                        }
                      }}
                    >
                      <TableCell className="font-medium">{comparison.folderName}</TableCell>
                      <TableCell className="text-right">
                        {comparison.localMaxUid !== null ? comparison.localMaxUid.toLocaleString() : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {comparison.serverMaxUid !== null ? comparison.serverMaxUid.toLocaleString() : '-'}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {comparison.difference > 0 ? (
                          <span className="text-orange-500">{comparison.difference.toLocaleString()}</span>
                        ) : (
                          <span className="text-green-500">0</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(comparison)}</TableCell>
                      <TableCell>
                        {comparison.difference > 0 && onSelectFolder && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectFolder(comparison.folderName);
                            }}
                          >
                            Scarica
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between items-center">
              <Button variant="outline" onClick={fetchComparison}>
                🔄 Ricarica
              </Button>
              <div className="text-sm text-muted-foreground">
                {comparisons.filter(c => c.status === 'sync').length} sincronizzate • 
                {comparisons.filter(c => c.status === 'behind').length} da aggiornare • 
                {comparisons.filter(c => c.status === 'missing').length} mancanti
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
