import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, Trash2, FileCode, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface IndexStats {
  indexed: number;
  updated: number;
  errors: number;
  files: string[];
  errorDetails: Array<{ file: string; error: string }>;
}

interface LogEntry {
  type: 'success' | 'error' | 'info';
  message: string;
  timestamp: Date;
}

export default function CodeScreen() {
  const [isIndexing, setIsIndexing] = useState(false);
  const [totalFiles, setTotalFiles] = useState(0);
  const [lastIndexedAt, setLastIndexedAt] = useState<Date | null>(null);
  const [forceReindex, setForceReindex] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<IndexStats | null>(null);

  useEffect(() => {
    loadIndexStats();
  }, []);

  const loadIndexStats = async () => {
    try {
      // NOTA: Tabella 'code_index' rimossa - usa ai_collaboration_tasks
      const { count, error } = await supabase
        .from('ai_collaboration_tasks')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;

      setTotalFiles(count || 0);

      // Get last updated timestamp (usa 'updated_at', non 'last_updated')
      const { data: lastFile } = await supabase
        .from('ai_collaboration_tasks')
        .select('updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(); // Usa maybeSingle invece di single

      if (lastFile?.updated_at) {
        setLastIndexedAt(new Date(lastFile.updated_at));
      }
    } catch (error) {
      console.error('Error loading index stats:', error);
    }
  };

  const addLog = (type: LogEntry['type'], message: string) => {
    setLogs(prev => [...prev, { type, message, timestamp: new Date() }]);
  };

  const startIndexing = async () => {
    toast.error('Funzionalità disabilitata', {
      description: 'L\'indicizzazione del codebase è stata rimossa per risparmiare risorse.'
    });
  };

  const clearIndex = async () => {
    if (!confirm('Sei sicuro di voler cancellare tutto l\'indice del codice?')) {
      return;
    }

    try {
      // NOTA: Tabella 'code_index' rimossa - usa ai_collaboration_tasks
      const { error } = await supabase
        .from('ai_collaboration_tasks')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) throw error;

      setTotalFiles(0);
      setLastIndexedAt(null);
      addLog('info', 'Indice cancellato con successo');
      
      toast.success('Indice cancellato', {
        description: 'L\'indice del codice è stato completamente cancellato'
      });
    } catch (error) {
      console.error('Error clearing index:', error);
      toast.error('Errore durante la cancellazione dell\'indice');
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestione Indice Codice</h1>
          <p className="text-muted-foreground mt-2">
            Indicizza il codebase per abilitare l'analisi AI del codice sorgente
          </p>
        </div>
        <FileCode className="h-12 w-12 text-primary" />
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle>Stato Attuale</CardTitle>
          <CardDescription>Informazioni sull'indice del codice</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <FileCode className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">File Indicizzati</p>
                <p className="text-2xl font-bold">{totalFiles.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Ultima Scansione</p>
                <p className="text-lg font-semibold">
                  {lastIndexedAt 
                    ? lastIndexedAt.toLocaleString('it-IT', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'Mai'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {totalFiles > 0 ? (
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              ) : (
                <XCircle className="h-8 w-8 text-red-500" />
              )}
              <div>
                <p className="text-sm text-muted-foreground">Stato</p>
                <Badge variant={totalFiles > 0 ? 'default' : 'destructive'}>
                  {totalFiles > 0 ? 'Attivo' : 'Non Indicizzato'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="force-reindex"
                  checked={forceReindex}
                  onCheckedChange={setForceReindex}
                  disabled={isIndexing}
                />
                <Label htmlFor="force-reindex">Forza re-indicizzazione completa</Label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={clearIndex}
                disabled={isIndexing || totalFiles === 0}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Cancella Indice
              </Button>
              <Button
                onClick={startIndexing}
                disabled={isIndexing}
              >
                {isIndexing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Indicizzazione...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Indicizza Progetto
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Card */}
      {isIndexing && (
        <Card>
          <CardHeader>
            <CardTitle>Progresso Indicizzazione</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Scansione in corso...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Card */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Risultati Indicizzazione</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-600">{stats.indexed}</p>
                <p className="text-sm text-muted-foreground">File Indicizzati</p>
              </div>

              <div className="text-center p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <RefreshCw className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-600">{stats.updated}</p>
                <p className="text-sm text-muted-foreground">File Aggiornati</p>
              </div>

              <div className="text-center p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-red-600">{stats.errors}</p>
                <p className="text-sm text-muted-foreground">Errori</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Logs Card */}
      <Card>
        <CardHeader>
          <CardTitle>Log Attività</CardTitle>
          <CardDescription>Dettagli dell'operazione di indicizzazione</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] w-full rounded-md border p-4">
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nessuna attività registrata. Clicca su "Indicizza Progetto" per iniziare.
              </p>
            ) : (
              <div className="space-y-2 font-mono text-xs">
                {logs.map((log, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-2 ${
                      log.type === 'error'
                        ? 'text-red-600'
                        : log.type === 'success'
                        ? 'text-green-600'
                        : 'text-muted-foreground'
                    }`}
                  >
                    <span className="text-muted-foreground">
                      {log.timestamp.toLocaleTimeString('it-IT')}
                    </span>
                    <span className="flex-1">{log.message}</span>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Informazioni</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>Cartelle Scansionate:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4 text-muted-foreground">
            <li>src/components</li>
            <li>src/pages</li>
            <li>src/hooks</li>
            <li>src/lib</li>
            <li>src/integrations</li>
            <li>supabase/functions</li>
          </ul>
          <p className="pt-4">
            <strong>Cosa viene indicizzato:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4 text-muted-foreground">
            <li>Tutti i file .ts, .tsx, .js, .jsx</li>
            <li>Import ed export</li>
            <li>Funzioni e componenti</li>
            <li>Conteggio righe e token</li>
            <li>Score di complessità</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
