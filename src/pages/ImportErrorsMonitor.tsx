import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  Pause, 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertCircle,
  Zap,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ErrorRecord {
  id: string;
  row_number: number;
  error_message: string;
  error_type: string;
  status: string;
  attempted_corrections: number;
  created_at: string;
  updated_at: string;
}

interface ProcessingStats {
  total: number;
  processed: number;
  corrected: number;
  failed: number;
  pending: number;
}

export default function ImportErrorsMonitor() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const importLogId = searchParams.get('import_log_id');

  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [errors, setErrors] = useState<ErrorRecord[]>([]);
  const [stats, setStats] = useState<ProcessingStats>({
    total: 0,
    processed: 0,
    corrected: 0,
    failed: 0,
    pending: 0
  });
  const [activityLog, setActivityLog] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setActivityLog(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 99)]);
  };

  const loadErrors = async () => {
    if (!importLogId) return;

    try {
      const { data, error } = await supabase
        .from('import_errors')
        .select('*')
        .eq('import_log_id', importLogId)
        .order('row_number');

      if (error) throw error;

      setErrors(data || []);

      // Calcola statistiche
      const total = data?.length || 0;
      const corrected = data?.filter(e => e.status === 'corrected').length || 0;
      const failed = data?.filter(e => e.status === 'failed').length || 0;
      const pending = data?.filter(e => e.status === 'pending').length || 0;
      const processed = corrected + failed;

      setStats({
        total,
        processed,
        corrected,
        failed,
        pending
      });

    } catch (error) {
      console.error('Error loading errors:', error);
      toast.error('Errore caricamento errori');
    }
  };

  const startProcessing = async () => {
    if (!importLogId) return;

    setIsProcessing(true);
    setIsPaused(false);
    addLog('🚀 Avvio elaborazione AI...');

    try {
      const { data, error } = await supabase.functions.invoke('process-import-errors-ai', {
        body: {
          import_log_id: importLogId,
          max_attempts: 3,
          pause_requested: false
        }
      });

      if (error) throw error;

      addLog(`✅ Elaborazione completata!`);
      addLog(`📊 Processati: ${data.processed}`);
      addLog(`✨ Corretti: ${data.corrected}`);
      addLog(`❌ Falliti: ${data.failed}`);
      
      if (data.corrected > 0) {
        toast.success(`${data.corrected} righe riparate con successo!`);
      }

      loadErrors();

    } catch (error) {
      console.error('Error processing:', error);
      addLog(`❌ Errore: ${error instanceof Error ? error.message : 'Sconosciuto'}`);
      toast.error('Errore durante elaborazione');
    } finally {
      setIsProcessing(false);
    }
  };

  const pauseProcessing = () => {
    setIsPaused(true);
    addLog('⏸️ Pausa richiesta...');
    toast.info('Elaborazione in pausa');
  };

  const resumeProcessing = () => {
    setIsPaused(false);
    addLog('▶️ Ripresa elaborazione...');
    startProcessing();
  };

  // Real-time subscription
  useEffect(() => {
    if (!importLogId) return;

    loadErrors();

    const channel = supabase
      .channel('import-errors-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'import_errors',
          filter: `import_log_id=eq.${importLogId}`
        },
        (payload) => {
          console.log('Real-time update:', payload);
          
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as ErrorRecord;
            addLog(`🔄 Riga ${updated.row_number}: ${updated.status}`);
          }
          
          loadErrors();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [importLogId]);

  if (!importLogId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Errore</CardTitle>
            <CardDescription>Import Log ID mancante</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/import-templates')}>
              Torna a Gestione Import
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const percentage = stats.total > 0 ? Math.round((stats.processed / stats.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate('/import-templates')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Torna a Import
          </Button>
        </div>

        {/* Contatore Righe Riparate */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/20">
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-3xl font-bold">{stats.corrected}</CardTitle>
                  <CardDescription>Righe Riparate con AI</CardDescription>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-muted-foreground">{stats.failed}</div>
                <div className="text-sm text-muted-foreground">Fallite</div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Progress & Controls */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Elaborazione Errori AI</CardTitle>
                <CardDescription>
                  {stats.pending} errori da elaborare su {stats.total} totali
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {!isProcessing ? (
                  <Button
                    onClick={startProcessing}
                    disabled={stats.pending === 0}
                    className="gap-2"
                  >
                    <Play className="h-4 w-4" />
                    Avvia Elaborazione
                  </Button>
                ) : isPaused ? (
                  <Button
                    onClick={resumeProcessing}
                    variant="outline"
                    className="gap-2"
                  >
                    <Play className="h-4 w-4" />
                    Riprendi
                  </Button>
                ) : (
                  <Button
                    onClick={pauseProcessing}
                    variant="outline"
                    className="gap-2"
                  >
                    <Pause className="h-4 w-4" />
                    Pausa
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progresso: {percentage}%</span>
                <span>{stats.processed} / {stats.total}</span>
              </div>
              <Progress value={percentage} className="h-3" />
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Totali</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-green-500/10">
                <div className="text-2xl font-bold text-green-600">{stats.corrected}</div>
                <div className="text-xs text-muted-foreground">Corretti</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-red-500/10">
                <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                <div className="text-xs text-muted-foreground">Falliti</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-blue-500/10">
                <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Activity Log */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Log Attività
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-1 font-mono text-sm">
                  {activityLog.length === 0 ? (
                    <div className="text-muted-foreground text-center py-8">
                      Nessuna attività registrata
                    </div>
                  ) : (
                    activityLog.map((log, i) => (
                      <div key={i} className="text-xs">{log}</div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Errors List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Errori da Elaborare
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {errors.filter(e => e.status === 'pending' || e.status === 'processing').length === 0 ? (
                    <div className="text-muted-foreground text-center py-8">
                      Nessun errore da elaborare
                    </div>
                  ) : (
                    errors
                      .filter(e => e.status === 'pending' || e.status === 'processing')
                      .map((error) => (
                        <div
                          key={error.id}
                          className={cn(
                            "p-3 rounded-lg border transition-colors",
                            error.status === 'processing' && "border-blue-500 bg-blue-500/5"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">
                                  Riga {error.row_number}
                                </Badge>
                                {error.status === 'processing' && (
                                  <Badge className="text-xs bg-blue-500">
                                    <Clock className="h-3 w-3 mr-1 animate-spin" />
                                    Elaborazione...
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {error.error_message}
                              </div>
                              {error.attempted_corrections > 0 && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Tentativi: {error.attempted_corrections}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

        </div>

        {/* Results Summary */}
        {stats.processed > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Risultati Elaborazione</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {errors
                  .filter(e => e.status === 'corrected' || e.status === 'failed')
                  .slice(0, 10)
                  .map((error) => (
                    <div
                      key={error.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        {error.status === 'corrected' ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                        <div>
                          <div className="font-medium">Riga {error.row_number}</div>
                          <div className="text-sm text-muted-foreground">
                            {error.error_message}
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant={error.status === 'corrected' ? 'default' : 'destructive'}
                      >
                        {error.status === 'corrected' ? 'Corretto' : 'Fallito'}
                      </Badge>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}