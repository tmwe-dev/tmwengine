import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Trash2, Eye, PlayCircle, RefreshCw } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { ImportLogMobileCard } from '@/components/import/ImportLogMobileCard';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ImportProgressMonitor } from '@/components/import/ImportProgressMonitor';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ImportLog {
  id: string;
  file_name: string;
  file_path: string;
  nome_tabella_temporanea: string | null;
  righe_totali: number;
  righe_importate: number;
  righe_errori: number;
  contatti_selezionati: number;
  stato: string;
  trasferiti_rubrica: boolean;
  created_at: string;
}

export default function GestisciImport() {
  const [importLogs, setImportLogs] = useState<ImportLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [monitoringImportId, setMonitoringImportId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [importToDelete, setImportToDelete] = useState<string | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    loadImportLogs();
  }, []);

  const loadImportLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('import_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setImportLogs(data || []);
    } catch (error) {
      console.error('Error loading import logs:', error);
      toast.error('Errore nel caricamento degli import');
    } finally {
      setLoading(false);
    }
  };

  const processFile = async (importLogId: string) => {
    try {
      setMonitoringImportId(importLogId);

      const { error: invokeError } = await supabase.functions.invoke(
        'process-import-file',
        {
          body: { importLogId }
        }
      );

      if (invokeError) throw invokeError;

      toast.success('Elaborazione avviata');
    } catch (error: any) {
      console.error('Error processing file:', error);
      toast.error(error.message || 'Errore durante l\'elaborazione del file');
      setMonitoringImportId(null);
    }
  };

  const handleDeleteImport = async () => {
    if (!importToDelete) return;

    try {
      const { error } = await supabase
        .from('import_logs')
        .delete()
        .eq('id', importToDelete);

      if (error) throw error;

      toast.success('Import eliminato con successo');
      loadImportLogs();
    } catch (error) {
      console.error('Error deleting import:', error);
      toast.error('Errore durante l\'eliminazione dell\'import');
    } finally {
      setDeleteDialogOpen(false);
      setImportToDelete(null);
    }
  };

  const getStateBadgeColor = (stato: string) => {
    switch (stato) {
      case 'completato':
        return 'bg-green-500';
      case 'elaborazione':
        return 'bg-blue-500';
      case 'errore':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusBadge = (stato: string) => {
    const color = getStateBadgeColor(stato);
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${color}`}>
        {stato}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gestisci Import</h1>
        <Button onClick={loadImportLogs} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Aggiorna
        </Button>
      </div>

      {monitoringImportId && (
        <Card>
          <CardContent className="pt-6">
            <ImportProgressMonitor
              importLogId={monitoringImportId}
              onComplete={() => {
                setMonitoringImportId(null);
                loadImportLogs();
              }}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Storico Import</CardTitle>
        </CardHeader>
        <CardContent>
          {importLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nessun import trovato
            </div>
          ) : isMobile ? (
            <div className="space-y-3">
              {importLogs.map((log) => (
                <ImportLogMobileCard
                  key={log.id}
                  log={log}
                  onViewRecords={() => {
                    window.location.href = `/import-templates?openImport=${log.id}`;
                  }}
                  onProcess={() => processFile(log.id)}
                  onDelete={() => {
                    setImportToDelete(log.id);
                    setDeleteDialogOpen(true);
                  }}
                  getStatusBadge={getStatusBadge}
                  isProcessing={monitoringImportId === log.id}
                  isLoading={false}
                  isSelected={false}
                />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="text-right">Totale</TableHead>
                  <TableHead className="text-right">Importati</TableHead>
                  <TableHead className="text-right">Errori</TableHead>
                  <TableHead className="text-right">Selezionati</TableHead>
                  <TableHead className="text-center">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.file_name}</TableCell>
                    <TableCell>
                      {new Date(log.created_at).toLocaleDateString('it-IT')}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${getStateBadgeColor(
                          log.stato
                        )}`}
                      >
                        {log.stato}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{log.righe_totali}</TableCell>
                    <TableCell className="text-right">{log.righe_importate}</TableCell>
                    <TableCell className="text-right">{log.righe_errori}</TableCell>
                    <TableCell className="text-right">
                      {log.contatti_selezionati}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            window.location.href = `/import-templates?openImport=${log.id}`;
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {(log.stato === 'pronto_per_elaborazione' ||
                          log.stato === 'file_salvato') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => processFile(log.id)}
                          >
                            <PlayCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setImportToDelete(log.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare questo import? Questa azione non può essere
              annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteImport}>Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
