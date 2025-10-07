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
  TrendingUp,
  Coins,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ErrorRecord {
  id: string;
  row_number: number;
  error_message: string;
  error_type: string;
  status: string;
  attempted_corrections: number;
  created_at: string;
  updated_at: string;
  corrected_data?: any;
}

interface ProcessingStats {
  total: number;
  processed: number;
  corrected: number;
  failed: number;
  pending: number;
  total_tokens: number;
  estimated_cost: number;
}

interface BatchResult {
  processed: number;
  corrected: number;
  failed: number;
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  estimated_cost: number;
  batch_complete: boolean;
  next_batch: number;
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
    pending: 0,
    total_tokens: 0,
    estimated_cost: 0
  });
  const [activityLog, setActivityLog] = useState<string[]>([]);
  const [batchSize, setBatchSize] = useState<number>(25);
  const [currentBatch, setCurrentBatch] = useState<number>(0);
  const [lastBatchResult, setLastBatchResult] = useState<BatchResult | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

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
        .order('row_number')
        .limit(50000); // Rimuovi il limite di default di 1000

      if (error) throw error;

      setErrors(data || []);

      // Calcola statistiche
      const total = data?.length || 0;
      const corrected = data?.filter(e => e.status === 'corrected').length || 0;
      const failed = data?.filter(e => e.status === 'failed').length || 0;
      const pending = data?.filter(e => e.status === 'pending').length || 0;
      const processed = corrected + failed;

      // Calcola token totali e costo dai dati salvati
      let totalTokens = 0;
      let totalCost = 0;
      data?.forEach(e => {
        if (e.ai_suggestions && typeof e.ai_suggestions === 'object') {
          const suggestions = e.ai_suggestions as any;
          if (suggestions.tokens_used) {
            totalTokens += suggestions.tokens_used;
          }
        }
      });
      
      // Stima costo (approssimativa se non abbiamo i dettagli esatti)
      totalCost = (totalTokens / 1000000) * 0.15; // Media tra input e output

      setStats({
        total,
        processed,
        corrected,
        failed,
        pending,
        total_tokens: totalTokens,
        estimated_cost: totalCost
      });

    } catch (error) {
      console.error('Error loading errors:', error);
      toast.error('Errore caricamento errori');
    }
  };

  const processBatch = async () => {
    if (!importLogId) return;

    setIsProcessing(true);
    setAwaitingConfirmation(false);
    addLog(`🚀 Avvio elaborazione batch (${batchSize} righe)...`);

    try {
      const { data, error } = await supabase.functions.invoke('process-import-errors-ai', {
        body: {
          import_log_id: importLogId,
          batch_size: batchSize,
          continue_from_batch: currentBatch
        }
      });

      if (error) throw error;

      const result = data as BatchResult;
      setLastBatchResult(result);

      addLog(`✅ Batch completato!`);
      addLog(`📊 Processati: ${result.processed} | Corretti: ${result.corrected} | Falliti: ${result.failed}`);
      addLog(`🎯 Token usati: ${result.total_tokens.toLocaleString()} (Input: ${result.input_tokens} | Output: ${result.output_tokens})`);
      addLog(`💰 Costo batch: $${result.estimated_cost.toFixed(6)}`);

      // NON aggiornare stats localmente - ricarica dal database per dati reali
      addLog(`🔄 Ricarico dati aggiornati dal database...`);
      
      if (result.corrected > 0) {
        toast.success(`${result.corrected} righe riparate! Token: ${result.total_tokens} | Costo: $${result.estimated_cost.toFixed(6)}`);
      }

      // Ricarica tutto dal database per avere dati reali
      await loadErrors();

      // Se ci sono ancora righe pending, chiedi conferma
      if (!result.batch_complete) {
        setAwaitingConfirmation(true);
        setCurrentBatch(result.next_batch);
        addLog(`⏸️ Batch completato. In attesa di conferma per continuare...`);
      } else {
        addLog(`✨ Tutte le righe sono state elaborate!`);
        setAwaitingConfirmation(false);
      }

    } catch (error) {
      console.error('Error processing:', error);
      addLog(`❌ Errore: ${error instanceof Error ? error.message : 'Sconosciuto'}`);
      toast.error('Errore durante elaborazione');
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmAndImport = async () => {
    if (!importLogId) return;

    try {
      addLog('📥 Conferma importazione record corretti...');
      
      const { data, error } = await supabase.functions.invoke('confirm-corrected-errors', {
        body: { import_log_id: importLogId }
      });

      if (error) throw error;

      addLog(`✅ Importazione completata!`);
      addLog(`📊 ${data.imported} record aggiunti a Rubrica`);
      
      toast.success(`${data.imported} record importati con successo!`);
      
      loadErrors();

    } catch (error) {
      console.error('Error confirming import:', error);
      addLog(`❌ Errore: ${error instanceof Error ? error.message : 'Sconosciuto'}`);
      toast.error('Errore durante importazione');
    }
  };

  const continueProcessing = () => {
    setAwaitingConfirmation(false);
    processBatch();
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

        {/* Contatori Token e Costo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-blue-500/20 bg-gradient-to-r from-blue-500/5 to-blue-500/10">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-500/20">
                  <Activity className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold">{stats.total_tokens.toLocaleString()}</CardTitle>
                  <CardDescription>Token Totali Utilizzati</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="border-green-500/20 bg-gradient-to-r from-green-500/5 to-green-500/10">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-500/20">
                  <Coins className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold">${stats.estimated_cost.toFixed(6)}</CardTitle>
                  <CardDescription>Costo Stimato Totale</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
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
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle>Elaborazione Errori AI</CardTitle>
                  <CardDescription>
                    {stats.pending} errori da elaborare su {stats.total} totali
                  </CardDescription>
                </div>
              </div>
              
              {/* Dropdown Batch Size - Centrato */}
              <div className="flex items-center justify-center gap-2">
                <span className="text-sm text-muted-foreground">Righe per batch:</span>
                <Select 
                  value={batchSize.toString()} 
                  onValueChange={(v) => setBatchSize(Number(v))}
                  disabled={isProcessing}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Pulsanti di controllo - Centrati */}
              <div className="flex items-center justify-center gap-3">
                {!isProcessing && !awaitingConfirmation ? (
                  <>
                    <Button
                      onClick={processBatch}
                      disabled={stats.pending === 0}
                      className="gap-2"
                    >
                      <Play className="h-4 w-4" />
                      Avvia Batch ({batchSize} righe)
                    </Button>
                    {stats.corrected > 0 && (
                      <Button
                        onClick={confirmAndImport}
                        variant="default"
                        className="gap-2 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Conferma e Importa ({stats.corrected})
                      </Button>
                    )}
                  </>
                ) : awaitingConfirmation ? (
                  <Button
                    onClick={continueProcessing}
                    className="gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    <Play className="h-4 w-4" />
                    Continua Prossimo Batch
                  </Button>
                ) : (
                  <Button
                    disabled
                    variant="outline"
                    className="gap-2"
                  >
                    <Clock className="h-4 w-4 animate-spin" />
                    Elaborazione...
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

            {/* Ultimo Batch Result */}
            {lastBatchResult && (
              <Card className="border-blue-500/30 bg-blue-500/5">
                <CardContent className="pt-4">
                  <div className="text-sm font-medium mb-2">📊 Risultato Ultimo Batch:</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Processati:</span>
                      <span className="ml-2 font-semibold">{lastBatchResult.processed}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Corretti:</span>
                      <span className="ml-2 font-semibold text-green-600">{lastBatchResult.corrected}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Token:</span>
                      <span className="ml-2 font-semibold">{lastBatchResult.total_tokens.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Costo:</span>
                      <span className="ml-2 font-semibold">${lastBatchResult.estimated_cost.toFixed(6)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

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