import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Upload, Trash2, Users, Database, Search, Filter, ChevronUp, ChevronDown } from 'lucide-react';
import { ImportProgressMonitor } from '@/components/import/ImportProgressMonitor';
import { ImportLogMobileCard } from '@/components/import/ImportLogMobileCard';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const navigate = useNavigate();
  const [importLogs, setImportLogs] = useState<ImportLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [monitoringImportId, setMonitoringImportId] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState({
    isProcessing: false
  });
  const [selectedImport, setSelectedImport] = useState<ImportLog | null>(null);
  const [loadingAllRecords, setLoadingAllRecords] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    loadImportLogs();
  }, []);

  const loadImportLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('import_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setImportLogs(data || []);
    } catch (error) {
      console.error('Errore nel caricamento log importazioni:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (stato: string) => {
    const statusMap: { [key: string]: { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } } = {
      'pronto_per_elaborazione': { label: 'Pronto', variant: 'outline' },
      'file_salvato': { label: 'Salvato', variant: 'secondary' },
      'in_elaborazione': { label: 'Elaborazione...', variant: 'default' },
      'completato': { label: 'Completato', variant: 'default' },
      'errore': { label: 'Errore', variant: 'destructive' }
    };

    const status = statusMap[stato] || { label: stato, variant: 'outline' as const };
    return <Badge variant={status.variant}>{status.label}</Badge>;
  };

  const processFile = async (logId: string) => {
    try {
      setImportProgress({ isProcessing: true });
      setMonitoringImportId(logId);

      const { data, error } = await supabase.functions.invoke('process-saved-file', {
        body: { import_log_id: logId }
      });

      if (error) throw error;

      toast.success('File elaborato con successo');
      await loadImportLogs();
    } catch (error: any) {
      console.error('Errore elaborazione file:', error);
      toast.error(error.message || 'Errore durante l\'elaborazione del file');
      setMonitoringImportId(null);
    } finally {
      setImportProgress({ isProcessing: false });
    }
  };

  const viewImportRecords = (log: ImportLog) => {
    // Naviga alla pagina Import Templates con il parametro per aprire la dialog
    navigate(`/import-templates?openImport=${log.id}`);
  };

  const deleteImportFile = async (log: ImportLog) => {
    if (!confirm(`Vuoi eliminare "${log.file_name}"?`)) return;

    try {
      const { error } = await supabase
        .from('import_logs')
        .delete()
        .eq('id', log.id);

      if (error) throw error;

      toast.success('File eliminato');
      loadImportLogs();
    } catch (error) {
      console.error('Errore eliminazione:', error);
      toast.error('Errore durante l\'eliminazione');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-foreground">Gestisci Import</h1>
        <p className="text-muted-foreground">Visualizza e gestisci i file importati. Seleziona i contatti da trasferire nella rubrica principale.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Log Importazioni
          </CardTitle>
          <CardDescription>
            Gestisci i file importati e trasferisci i contatti nella rubrica principale
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isMobile ? (
            /* Mobile View - Cards */
            <div className="space-y-3">
              {importLogs.map((log) => (
                <ImportLogMobileCard
                  key={log.id}
                  log={log}
                  onProcess={() => processFile(log.id)}
                  onViewRecords={() => viewImportRecords(log)}
                  onDelete={() => deleteImportFile(log)}
                  getStatusBadge={getStatusBadge}
                  isProcessing={importProgress.isProcessing}
                  isLoading={loadingAllRecords && selectedImport?.id === log.id}
                  isSelected={selectedImport?.id === log.id}
                />
              ))}
            </div>
          ) : (
            /* Desktop View - Table */
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Record</TableHead>
                  <TableHead>Errori</TableHead>
                  <TableHead>Selezionati</TableHead>
                  <TableHead>Azioni</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {new Date(log.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{log.file_name}</TableCell>
                    <TableCell>{getStatusBadge(log.stato)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-primary">{log.righe_totali}</span>
                        <span className="text-sm text-muted-foreground">record</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-red-600">{log.righe_errori}</TableCell>
                    <TableCell className="text-blue-600">{log.contatti_selezionati}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {/* Pulsante per processare file salvati */}
                        {(log.stato === 'pronto_per_elaborazione' || log.stato === 'file_salvato') && (
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => processFile(log.id)}
                            disabled={importProgress.isProcessing}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Upload className="h-4 w-4 mr-1" />
                            Elabora
                          </Button>
                        )}
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => viewImportRecords(log)}
                          disabled={loadingAllRecords || log.stato === 'pronto_per_elaborazione' || log.stato === 'file_salvato'}
                        >
                          <Users className="h-4 w-4" />
                          {loadingAllRecords && selectedImport?.id === log.id ? 'Caricamento...' : 'Gestisci'}
                        </Button>
                        
                        {log.trasferiti_rubrica && (
                          <Badge variant="outline" className="text-blue-800 bg-transparent border-transparent">
                            Trasferiti
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => deleteImportFile(log)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          
          {importLogs.length === 0 && !loading && (
            <div className="text-center py-8 text-muted-foreground">
              Nessun file importato
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Monitor progresso importazione */}
      {monitoringImportId && (
        <ImportProgressMonitor
          importLogId={monitoringImportId}
          onComplete={() => {
            loadImportLogs();
            setMonitoringImportId(null);
          }}
        />
      )}
    </div>
  );
}
