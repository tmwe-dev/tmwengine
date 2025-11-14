import { useState, useEffect, useRef } from 'react';
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
  PlayCircle,
  CheckCircle, 
  XCircle, 
  Clock,
  AlertCircle,
  Zap,
  TrendingUp,
  Coins,
  Activity,
  ChevronDown,
  ChevronUp,
  Plus,
  FileText,
  Sparkles,
  Trash2
} from 'lucide-react';
import { UnifiedAICommunicationBadge } from '@/components/ai/UnifiedAICommunicationBadge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

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
  raw_data?: any;
  ai_suggestions?: any;
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

  // REF per tracciare TUTTI i timeout attivi - EMERGENCY STOP
  const activeTimeouts = useRef<Set<NodeJS.Timeout>>(new Set());
  const activeIntervals = useRef<Set<NodeJS.Timeout>>(new Set());

  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [errors, setErrors] = useState<ErrorRecord[]>([]);
  const [correctedRecords, setCorrectedRecords] = useState<ErrorRecord[]>([]);
  const [failedRecords, setFailedRecords] = useState<ErrorRecord[]>([]);
  const [showCorrected, setShowCorrected] = useState(false);
  const [showFailed, setShowFailed] = useState(false);
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
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [importingRows, setImportingRows] = useState<Set<string>>(new Set());
  const [expandedFailedRows, setExpandedFailedRows] = useState<Set<string>>(new Set());
  const [selectedFailedRecords, setSelectedFailedRecords] = useState<Set<string>>(new Set());
  const [processingAI, setProcessingAI] = useState<Set<string>>(new Set());
  const [autoRun, setAutoRun] = useState(false);
  const [showActivityLog, setShowActivityLog] = useState(true);
  const [showFreePrompt, setShowFreePrompt] = useState(true);
  const [freePrompt, setFreePrompt] = useState<string>(
    `Sei un assistente AI specializzato nella normalizzazione dei dati di importazione.

OBIETTIVO: Analizzare il testo grezzo fornito ed estrarre tutte le informazioni possibili per creare un record strutturato.

STRUTTURA DI DESTINAZIONE (campi della tabella imported_contacts):
- company_name: Nome dell'azienda
- name: Nome del contatto/persona
- email: Indirizzo email
- phone: Telefono fisso
- cell: Cellulare
- address: Indirizzo completo
- city: Città
- country: Paese/Nazione
- zip_code: CAP/Codice postale
- position: Posizione/Ruolo
- note: Note aggiuntive
- [altri campi meta_* per flags booleani]

ISTRUZIONI:
1. Leggi attentamente il testo grezzo fornito
2. Identifica e estrai tutte le informazioni presenti
3. Normalizza i dati secondo la struttura di destinazione
4. Se un campo non è presente nel testo, restituisci null
5. Usa il tool "normalize_record" per restituire i dati strutturati in formato JSON

IMPORTANTE: Restituisci SEMPRE i dati usando il tool fornito, mai come testo libero.`
  );

  // EMERGENCY STOP - cancella TUTTI i timeout/interval attivi
  const emergencyStop = () => {
    console.log('🛑 EMERGENCY STOP: Cancello tutti i timeout e interval attivi');
    activeTimeouts.current.forEach(timeout => clearTimeout(timeout));
    activeIntervals.current.forEach(interval => clearInterval(interval));
    activeTimeouts.current.clear();
    activeIntervals.current.clear();
    setIsProcessing(false);
    addLog('🛑 EMERGENCY STOP: Tutti i processi sono stati bloccati');
    toast.info('Elaborazione interrotta');
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setActivityLog(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 99)]);
  };

  const loadErrors = async () => {
    if (!importLogId) return;

    try {
      // Usa COUNT separato per ogni status per evitare il limite di 1000
      const { count: totalCount } = await supabase
        .from('import_errors')
        .select('*', { count: 'exact', head: true })
        .eq('import_log_id', importLogId);

      const { count: correctedCount } = await supabase
        .from('import_errors')
        .select('*', { count: 'exact', head: true })
        .eq('import_log_id', importLogId)
        .eq('status', 'corrected');

      const { count: failedCount } = await supabase
        .from('import_errors')
        .select('*', { count: 'exact', head: true })
        .eq('import_log_id', importLogId)
        .eq('status', 'failed');

      const { count: pendingCount } = await supabase
        .from('import_errors')
        .select('*', { count: 'exact', head: true })
        .eq('import_log_id', importLogId)
        .eq('status', 'pending');

      const total = totalCount || 0;
      const corrected = correctedCount || 0;
      const failed = failedCount || 0;
      const pending = pendingCount || 0;
      const processed = corrected + failed;

      // Carica SOLO i primi 100 errori pending per la UI
      const { data: pendingErrors, error: errorsError } = await supabase
        .from('import_errors')
        .select('*')
        .eq('import_log_id', importLogId)
        .in('status', ['pending', 'processing'])
        .order('row_number')
        .limit(100);

      if (errorsError) throw errorsError;
      setErrors(pendingErrors || []);

      // Carica i record corretti (primi 100)
      const { data: correctedData } = await supabase
        .from('import_errors')
        .select('*')
        .eq('import_log_id', importLogId)
        .eq('status', 'corrected')
        .order('row_number')
        .limit(100);
      
      setCorrectedRecords(correctedData || []);

      // Carica i record falliti (primi 100)
      const { data: failedData } = await supabase
        .from('import_errors')
        .select('*')
        .eq('import_log_id', importLogId)
        .eq('status', 'failed')
        .order('row_number')
        .limit(100);
      
      setFailedRecords(failedData || []);

      // Calcola token totali SOLO dai record già processati (con ai_suggestions)
      const { data: processedData } = await supabase
        .from('import_errors')
        .select('ai_suggestions')
        .eq('import_log_id', importLogId)
        .not('ai_suggestions', 'is', null)
        .limit(10000);

      let totalTokens = 0;
      processedData?.forEach(e => {
        if (e.ai_suggestions && typeof e.ai_suggestions === 'object') {
          const suggestions = e.ai_suggestions as any;
          if (suggestions.tokens_used) {
            totalTokens += suggestions.tokens_used;
          }
        }
      });
      
      const totalCost = (totalTokens / 1000000) * 0.15;

      console.log('📊 Stats caricate:', { total, corrected, failed, pending, totalTokens, totalCost });

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

  const processBatch = async (autoTriggered = false) => {
    if (!importLogId) return;

    // BLOCCO EMERGENZA: se autoRun è disattivato durante chiamata automatica
    if (autoTriggered && !autoRun) {
      console.log('🛑 BLOCCO EMERGENZA: AutoRun disattivato, blocco processBatch');
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);
    setAwaitingConfirmation(false);
    addLog(`🚀 Avvio elaborazione batch (${batchSize} righe)${autoTriggered ? ' [AUTO]' : ''}...`);

    let isBackgroundProcessing = false; // Flag per evitare reset nel finally

    try {
      console.log('🔍 STATO CORRENTE:');
      console.log('  - batchSize:', batchSize, 'tipo:', typeof batchSize);
      console.log('  - currentBatch:', currentBatch);
      console.log('📤 Invio richiesta con batch_size:', batchSize, 'tipo:', typeof batchSize);
      
      const { data, error } = await supabase.functions.invoke('process-import-errors-ai', {
        body: {
          import_log_id: importLogId,
          batch_size: batchSize,
          continue_from_batch: currentBatch
        }
      });
      console.log('📥 Risposta ricevuta:', data);

      if (error) throw error;

      const result = data as BatchResult;
      setLastBatchResult(result);

      // Se è background processing (batch > 25), avvia polling
      if ((result as any).processing) {
        isBackgroundProcessing = true; // IMPORTANTE: segnala che è background
        console.log('⚙️ Background processing rilevato, MANTIENI isProcessing = true');
        addLog(`🚀 Background processing avviato per ${batchSize} records`);
        addLog(`⏱️ Tempo stimato: ~${(result as any).estimated_duration}s`);
        addLog(`📊 Il database verrà aggiornato automaticamente in tempo reale`);
        
        toast.success(`Processing ${batchSize} records in background. Ricarica i dati tra ~${(result as any).estimated_duration}s`, { duration: 5000 });
        
        // Attendi completamento e ricarica automaticamente
        const estimatedDuration = (result as any).estimated_duration || 100;
        
        const timeoutId = setTimeout(async () => {
          addLog(`🔄 Ricarico dati dal database dopo background processing...`);
          await loadErrors();
          setIsProcessing(false); // ORA si può resettare
          
          // SOLO se autoRun è attivo, ricontrolla pending
          if (autoRun) {
            const { count: stillPending } = await supabase
              .from('import_errors')
              .select('*', { count: 'exact', head: true })
              .eq('import_log_id', importLogId)
              .eq('status', 'pending');
            
            if (stillPending && stillPending > 0) {
              addLog(`📊 ${stillPending} righe ancora pending, continuo...`);
              processBatch(true);
            } else {
              addLog(`✨ AutoRun completato: nessuna riga pendente`);
              setAutoRun(false);
              toast.success('AutoRun completato!');
            }
          } else {
            addLog(`✅ Background processing completato`);
          }
          
          activeTimeouts.current.delete(timeoutId);
        }, estimatedDuration * 1000 + 3000);
        
        activeTimeouts.current.add(timeoutId); // Traccia il timeout
        
        return; // ESCI SENZA passare per finally
      }

      addLog(`✅ Batch completato!`);
      addLog(`📊 Processati: ${result.processed} | Corretti: ${result.corrected} | Falliti: ${result.failed}`);
      addLog(`🎯 Token usati: ${(result.total_tokens || 0).toLocaleString()} (Input: ${result.input_tokens || 0} | Output: ${result.output_tokens || 0})`);
      addLog(`💰 Costo batch: $${(result.estimated_cost || 0).toFixed(6)}`);

      addLog(`🔄 Ricarico dati aggiornati dal database...`);
      
      if (result.corrected > 0) {
        toast.success(`${result.corrected} righe riparate! Token: ${result.total_tokens || 0} | Costo: $${(result.estimated_cost || 0).toFixed(6)}`);
      }

      // Ricarica tutto dal database per avere dati reali
      await loadErrors();

      // Se ci sono ancora righe pending
      if (!result.batch_complete) {
        setCurrentBatch(result.next_batch);
        
        // Se autorun è attivo, continua automaticamente dopo 1s
        if (autoRun) {
          addLog(`⏰ AutoRun attivo: continuo con il prossimo batch tra 1 secondo...`);
          const timeoutId = setTimeout(() => {
            // CRITICO: Ricontrolla autoRun prima di avviare nuovo batch
            if (!autoRun) {
              console.log('⛔ AutoRun disattivato prima di avviare nuovo batch, ANNULLO');
              addLog(`⚠️ Elaborazione interrotta: AutoRun disattivato dall'utente`);
              activeTimeouts.current.delete(timeoutId);
              return;
            }
            processBatch(true);
            activeTimeouts.current.delete(timeoutId);
          }, 1000);
          activeTimeouts.current.add(timeoutId);
        } else {
          setAwaitingConfirmation(true);
          addLog(`⏸️ Batch completato. In attesa di conferma per continuare...`);
        }
      } else {
        addLog(`✨ Tutte le righe sono state elaborate!`);
        setAwaitingConfirmation(false);
        if (autoRun) {
          addLog(`🎉 AutoRun completato con successo!`);
          setAutoRun(false);
          toast.success('AutoRun completato con successo!');
        }
      }

    } catch (error) {
      console.error('Error processing:', error);
      addLog(`❌ Errore: ${error instanceof Error ? error.message : 'Sconosciuto'}`);
      toast.error('Errore durante elaborazione');
      
      // Disattiva autorun in caso di errore
      if (autoRun) {
        setAutoRun(false);
        addLog(`⚠️ AutoRun disattivato a causa dell'errore`);
      }
    } finally {
      // NON resettare isProcessing se è background processing
      if (!isBackgroundProcessing) {
        setIsProcessing(false);
      } else {
        console.log('🔒 Background processing: isProcessing rimane TRUE');
      }
    }
  };

  const confirmAndImport = async () => {
    console.log('🟢 confirmAndImport chiamata, importLogId:', importLogId);
    if (!importLogId) {
      console.error('❌ Nessun importLogId disponibile');
      toast.error('ID importazione non disponibile');
      return;
    }

    try {
      addLog('📥 Conferma importazione record corretti...');
      console.log('🔄 Chiamata a confirm-corrected-errors con:', { import_log_id: importLogId });
      
      const { data, error } = await supabase.functions.invoke('confirm-corrected-errors', {
        body: { import_log_id: importLogId }
      });

      console.log('📦 Risposta ricevuta:', { data, error });

      if (error) throw error;

      addLog(`✅ Importazione completata!`);
      addLog(`📊 ${data.imported} record aggiunti a Rubrica`);
      
      toast.success(`${data.imported} record importati con successo!`);
      
      loadErrors();

    } catch (error) {
      console.error('❌ Error confirming import:', error);
      addLog(`❌ Errore: ${error instanceof Error ? error.message : 'Sconosciuto'}`);
      toast.error('Errore durante importazione');
    }
  };

  const importSingleRecord = async (errorId: string) => {
    if (!importLogId) return;

    setImportingRows(prev => new Set(prev).add(errorId));

    try {
      addLog(`📥 Importazione singola riga...`);
      
      const { data, error } = await supabase.functions.invoke('confirm-corrected-errors', {
        body: { 
          import_log_id: importLogId,
          error_id: errorId 
        }
      });

      if (error) throw error;

      addLog(`✅ Riga importata con successo!`);
      toast.success('Record importato in Rubrica');
      
      // Rimuovi dalla lista dei corretti
      setCorrectedRecords(prev => prev.filter(r => r.id !== errorId));
      
      // Aggiorna stats
      setStats(prev => ({
        ...prev,
        corrected: Math.max(0, prev.corrected - 1)
      }));

    } catch (error) {
      console.error('Error importing single record:', error);
      addLog(`❌ Errore: ${error instanceof Error ? error.message : 'Sconosciuto'}`);
      toast.error('Errore durante importazione');
    } finally {
      setImportingRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(errorId);
        return newSet;
      });
    }
  };

  const deleteFailedRecords = async (recordIds: string[]) => {
    if (recordIds.length === 0) return;

    try {
      addLog(`🗑️ Eliminazione ${recordIds.length} record falliti...`);
      
      const { error } = await supabase
        .from('import_errors')
        .delete()
        .in('id', recordIds);

      if (error) throw error;

      addLog(`✅ ${recordIds.length} record eliminati!`);
      toast.success(`${recordIds.length} record eliminati con successo`);
      
      // Rimuovi dalla lista locale e deseleziona
      setFailedRecords(prev => prev.filter(r => !recordIds.includes(r.id)));
      setSelectedFailedRecords(new Set());
      
      // Aggiorna stats
      setStats(prev => ({
        ...prev,
        failed: Math.max(0, prev.failed - recordIds.length),
        total: Math.max(0, prev.total - recordIds.length)
      }));

    } catch (error) {
      console.error('Error deleting records:', error);
      addLog(`❌ Errore: ${error instanceof Error ? error.message : 'Sconosciuto'}`);
      toast.error('Errore durante eliminazione');
    }
  };

  const toggleSelectAll = () => {
    if (selectedFailedRecords.size === failedRecords.length) {
      setSelectedFailedRecords(new Set());
    } else {
      setSelectedFailedRecords(new Set(failedRecords.map(r => r.id)));
    }
  };

  const processSingleRecordAI = async (errorId: string) => {
    setProcessingAI(prev => new Set(prev).add(errorId));

    try {
      addLog(`🤖 Riprocessamento singolo record con AI libera...`);
      
      const { data, error } = await supabase.functions.invoke('process-single-error-ai', {
        body: { 
          error_id: errorId,
          free_prompt: freePrompt
        }
      });

      if (error) throw error;

      addLog(`✅ Record riprocessato con successo!`);
      addLog(`🎯 Token: ${data.tokens_used || 0} | Costo: $${(data.estimated_cost || 0).toFixed(6)}`);
      
      toast.success(`Record riparato! Token: ${data.tokens_used}`);
      
      // Ricarica i dati
      await loadErrors();

    } catch (error) {
      console.error('Error processing single record:', error);
      addLog(`❌ Errore: ${error instanceof Error ? error.message : 'Sconosciuto'}`);
      toast.error('Errore durante riprocessamento AI');
    } finally {
      setProcessingAI(prev => {
        const newSet = new Set(prev);
        newSet.delete(errorId);
        return newSet;
      });
    }
  };

  const processBatchFailedRecordsAI = async () => {
    const recordsToProcess = Array.from(selectedFailedRecords);
    if (recordsToProcess.length === 0) return;

    addLog(`🤖 Avvio riprocessamento batch di ${recordsToProcess.length} record falliti...`);
    
    let successCount = 0;
    let errorCount = 0;

    for (const recordId of recordsToProcess) {
      try {
        setProcessingAI(prev => new Set(prev).add(recordId));
        
        const { data, error } = await supabase.functions.invoke('process-single-error-ai', {
          body: { 
            error_id: recordId,
            free_prompt: freePrompt
          }
        });

        if (error) throw error;

        successCount++;
        addLog(`✅ Record riprocessato! Token: ${data.tokens_used}`);
        
      } catch (error) {
        errorCount++;
        addLog(`❌ Errore: ${error instanceof Error ? error.message : 'Sconosciuto'}`);
      } finally {
        setProcessingAI(prev => {
          const newSet = new Set(prev);
          newSet.delete(recordId);
          return newSet;
        });
      }
    }

    toast.success(`Batch completato: ${successCount} riparati, ${errorCount} errori`);
    setSelectedFailedRecords(new Set());
    await loadErrors();
  };

  const toggleSelectRecord = (recordId: string) => {
    setSelectedFailedRecords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recordId)) {
        newSet.delete(recordId);
      } else {
        newSet.add(recordId);
      }
      return newSet;
    });
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
            
            // Aggiorna il contatore in tempo reale
            if (updated.status === 'corrected') {
              addLog(`✅ Riga ${updated.row_number}: CORRETTO`);
              setStats(prev => ({
                ...prev,
                corrected: prev.corrected + 1,
                pending: Math.max(0, prev.pending - 1),
                processed: prev.processed + 1
              }));
            } else if (updated.status === 'failed') {
              addLog(`❌ Riga ${updated.row_number}: FALLITO`);
              setStats(prev => ({
                ...prev,
                failed: prev.failed + 1,
                pending: Math.max(0, prev.pending - 1),
                processed: prev.processed + 1
              }));
            }
          }
          
          // NON ricaricare automaticamente - causa loop infiniti
          // if (Math.random() < 0.2) {
          //   loadErrors();
          // }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [importLogId]);

  // AutoRun monitor - controlla continuamente se ci sono pending e autorun è attivo
  useEffect(() => {
    if (!autoRun || isProcessing || !importLogId) {
      console.log('AutoRun monitor DISABILITATO - autoRun:', autoRun, 'isProcessing:', isProcessing);
      return;
    }

    console.log('AutoRun monitor ATTIVATO');
    let timeoutId: NodeJS.Timeout | null = null;
    let intervalId: NodeJS.Timeout | null = null;

    const checkAndContinue = async () => {
      // CRITICO: controllo immediato se autoRun è ancora attivo
      if (!autoRun) {
        console.log('⛔ AutoRun disattivato durante check, BLOCCO');
        if (intervalId) clearInterval(intervalId);
        if (timeoutId) clearTimeout(timeoutId);
        return;
      }

      // Controlla se ci sono ancora pending nel database
      const { count: stillPending } = await supabase
        .from('import_errors')
        .select('*', { count: 'exact', head: true })
        .eq('import_log_id', importLogId)
        .eq('status', 'pending');
      
      console.log(`AutoRun check: ${stillPending} pending, processing: ${isProcessing}, autoRun: ${autoRun}`);
      
      // Altro controllo autoRun prima di procedere
      if (!autoRun) {
        console.log('⛔ AutoRun disattivato dopo query, BLOCCO');
        if (intervalId) clearInterval(intervalId);
        if (timeoutId) clearTimeout(timeoutId);
        return;
      }
      
      if (stillPending && stillPending > 0 && !isProcessing) {
        // TRIPLO controllo prima di schedulare
        if (!autoRun) {
          console.log('⛔ AutoRun disattivato prima di schedulare batch, ANNULLO');
          return;
        }
        
        addLog(`🔄 AutoRun: rilevati ${stillPending} record pending, riavvio elaborazione...`);
        timeoutId = setTimeout(() => {
          // Controllo finale prima di avviare batch
          if (!autoRun) {
            console.log('🛑 BLOCCO EMERGENZA: AutoRun disattivato prima di processBatch, ANNULLO');
            setIsProcessing(false);
            if (timeoutId) activeTimeouts.current.delete(timeoutId);
            return;
          }
          processBatch(true);
          if (timeoutId) activeTimeouts.current.delete(timeoutId);
        }, 2000);
        activeTimeouts.current.add(timeoutId);
      } else if (!stillPending || stillPending === 0) {
        addLog(`✨ AutoRun: completato, nessun record pending`);
        setAutoRun(false);
        toast.success('AutoRun completato!');
      }
    };

    // Controlla ogni 3 secondi
    intervalId = setInterval(checkAndContinue, 3000);
    activeIntervals.current.add(intervalId);

    return () => {
      console.log('🧹 AutoRun cleanup: cancello interval e timeout');
      if (intervalId) {
        clearInterval(intervalId);
        activeIntervals.current.delete(intervalId);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
        activeTimeouts.current.delete(timeoutId);
      }
    };
  }, [autoRun, isProcessing, importLogId]); // RIMOSSO stats.pending dalle dipendenze!

  // WATCH AutoRun: quando diventa false, EMERGENCY STOP
  useEffect(() => {
    if (!autoRun && (activeTimeouts.current.size > 0 || activeIntervals.current.size > 0)) {
      console.log('🚨 AutoRun disattivato con timeout/interval attivi! EMERGENCY STOP');
      emergencyStop();
    }
  }, [autoRun]);

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
          
          <UnifiedAICommunicationBadge pageRoute="/import-errors-monitor" />
        </div>

        {/* Free Prompt Configuration */}
        <Card className="border-purple-500/20 bg-gradient-to-r from-purple-500/5 to-purple-500/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  Prompt AI Libera (per riprocessamento singolo)
                </CardTitle>
                <CardDescription>
                  Questo prompt verrà usato quando premi il bottone AI sui record falliti. 
                  Puoi personalizzarlo per dare istruzioni specifiche all'AI.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFreePrompt(!showFreePrompt)}
              >
                {showFreePrompt ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          {showFreePrompt && (
            <CardContent>
            <div className="space-y-2">
              <Label htmlFor="free-prompt">Prompt AI</Label>
              <Textarea
                id="free-prompt"
                value={freePrompt}
                onChange={(e) => setFreePrompt(e.target.value)}
                className="font-mono text-sm min-h-[200px]"
                placeholder="Inserisci le istruzioni per l'AI..."
              />
              <p className="text-xs text-muted-foreground">
                💡 Questo prompt spiega all'AI come interpretare i dati grezzi e trasformarli nella struttura corretta.
              </p>
            </div>
            </CardContent>
          )}
        </Card>

        {/* Contatori Token e Costo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-blue-500/20 bg-gradient-to-r from-blue-500/5 to-blue-500/10">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-500/20">
                  <Activity className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold">{(stats.total_tokens || 0).toLocaleString()}</CardTitle>
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
                  <CardTitle className="text-2xl font-bold">${(stats.estimated_cost || 0).toFixed(6)}</CardTitle>
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
                  onValueChange={(v) => {
                    const newSize = Number(v);
                    console.log('🔢 Dropdown cambiato da', batchSize, 'a', newSize);
                    setBatchSize(newSize);
                    setCurrentBatch(0); // Reset batch quando cambi dimensione
                    addLog(`📏 Batch size cambiato a ${newSize} righe`);
                  }}
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
              <div className="flex flex-col items-center gap-3">
                {/* AutoRun Switch */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 w-full max-w-md">
                  <div className="space-y-1">
                    <Label htmlFor="auto-run" className="flex items-center gap-2 cursor-pointer">
                      <PlayCircle className={`h-4 w-4 ${autoRun ? 'text-green-500 animate-pulse' : 'text-muted-foreground'}`} />
                      <span className="font-medium">AutoRun</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {autoRun 
                        ? '🟢 Elaborazione continua automatica attiva'
                        : 'Attiva per continuare automaticamente i batch'}
                    </p>
                  </div>
                  <Switch
                    id="auto-run"
                    checked={autoRun}
                    onCheckedChange={setAutoRun}
                  />
                </div>

                {/* Bottoni */}
                <div className="flex items-center gap-3">
                  {(() => {
                    console.log('🔍 Render stato pulsanti - isProcessing:', isProcessing, 'awaitingConfirmation:', awaitingConfirmation);
                    
                    if (isProcessing) {
                      return (
                        <div className="flex flex-col items-center gap-2 p-3 rounded-lg">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Clock className="h-5 w-5 animate-spin text-blue-600" />
                            <span>{autoRun ? 'AutoRun in corso...' : 'Elaborazione in corso...'}</span>
                          </div>
                          {/* Contatore in tempo reale */}
                          <div className="text-xs text-muted-foreground flex gap-3">
                            <span>✅ <span className="font-bold text-green-600">{stats.corrected}</span> corretti</span>
                            <span>❌ <span className="font-bold text-red-600">{stats.failed}</span> falliti</span>
                            <span>⏳ <span className="font-bold text-yellow-600">{stats.pending}</span> rimanenti</span>
                          </div>
                        </div>
                      );
                    }
                    
                    if (awaitingConfirmation && !autoRun) {
                      return (
                        <>
                          <Button
                            onClick={() => processBatch(false)}
                            className="gap-2 bg-blue-600 hover:bg-blue-700"
                          >
                            <Play className="h-4 w-4" />
                            Continua Prossimo Batch
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
                      );
                    }
                    
                    // Default: mostra pulsanti normali
                    return (
                      <>
                        <Button
                          onClick={() => {
                            console.log('🚀 Avvio batch manuale, pending:', stats.pending, 'isProcessing:', isProcessing);
                            processBatch(false);
                          }}
                          disabled={stats.pending === 0}
                          className="gap-2"
                        >
                          <Play className="h-4 w-4" />
                          {autoRun ? 'Avvia AutoRun' : `Avvia Batch (${batchSize} righe)`}
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
                    );
                  })()}
                </div>
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
                      <span className="ml-2 font-semibold">{(lastBatchResult.total_tokens || 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Costo:</span>
                      <span className="ml-2 font-semibold">${(lastBatchResult.estimated_cost || 0).toFixed(6)}</span>
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
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Log Attività
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowActivityLog(!showActivityLog)}
                >
                  {showActivityLog ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
            </CardHeader>
            {showActivityLog && (
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
            )}
          </Card>

          {/* Records Corretti */}
          <Card>
            <CardHeader className="cursor-pointer" onClick={() => setShowCorrected(!showCorrected)}>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Records Corretti ({stats.corrected})
                </div>
                <Button variant="ghost" size="sm">
                  {showCorrected ? 'Nascondi' : 'Mostra'}
                </Button>
              </CardTitle>
            </CardHeader>
            {showCorrected && (
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {correctedRecords.length === 0 ? (
                      <div className="text-muted-foreground text-center py-8">
                        Nessun record corretto
                      </div>
                    ) : (
                      correctedRecords.map((error) => {
                        const isExpanded = expandedRows.has(error.id);
                        const isImporting = importingRows.has(error.id);
                        const data = error.corrected_data || {};
                        
                        // Campi prioritari
                        const companyName = data.company_name || data.azienda;
                        const contactName = data.contact_name || data.nome;
                        const address = data.address || data.indirizzo;
                        const zipCode = data.zip_code || data.cap;
                        const city = data.city || data.citta;
                        const country = data.country || data.paese;

                        return (
                          <Collapsible
                            key={error.id}
                            open={isExpanded}
                            onOpenChange={(open) => {
                              setExpandedRows(prev => {
                                const newSet = new Set(prev);
                                if (open) {
                                  newSet.add(error.id);
                                } else {
                                  newSet.delete(error.id);
                                }
                                return newSet;
                              });
                            }}
                          >
                            <div className="p-3 rounded-lg border border-green-500/30 bg-green-500/5 hover:bg-green-500/10 transition-colors">
                              <div className="flex items-center gap-2 justify-between">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <Badge variant="outline" className="text-xs bg-green-500/20 shrink-0">
                                    #{error.row_number}
                                  </Badge>
                                  
                                  <div className="flex items-center gap-2 flex-1 min-w-0 text-sm">
                                    {companyName && (
                                      <span className="font-semibold truncate">{companyName}</span>
                                    )}
                                    {contactName && (
                                      <span className="text-muted-foreground truncate">• {contactName}</span>
                                    )}
                                    {address && (
                                      <span className="text-muted-foreground text-xs truncate">• {address}</span>
                                    )}
                                    {zipCode && (
                                      <span className="text-muted-foreground text-xs truncate">{zipCode}</span>
                                    )}
                                    {city && (
                                      <span className="text-muted-foreground text-xs truncate">{city}</span>
                                    )}
                                    {country && (
                                      <span className="text-muted-foreground text-xs truncate">({country})</span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      importSingleRecord(error.id);
                                    }}
                                    disabled={isImporting}
                                    className="h-7 w-7 p-0"
                                  >
                                    {isImporting ? (
                                      <Activity className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Plus className="h-4 w-4" />
                                    )}
                                  </Button>
                                  
                                  <CollapsibleTrigger asChild>
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                                      {isExpanded ? (
                                        <ChevronUp className="h-4 w-4" />
                                      ) : (
                                        <ChevronDown className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </CollapsibleTrigger>
                                </div>
                              </div>

                              <CollapsibleContent className="mt-3">
                                {error.corrected_data && typeof error.corrected_data === 'object' && (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 text-xs font-mono pt-3 border-t border-green-500/20">
                                    {Object.entries(error.corrected_data).map(([key, value]) => (
                                      <div key={key} className="flex flex-col">
                                        <span className="text-muted-foreground font-semibold uppercase text-[10px]">
                                          {key.replace(/_/g, ' ')}
                                        </span>
                                        <div className="mt-1 break-words whitespace-normal">
                                          {value === null || value === undefined || value === '' ? (
                                            <span className="text-red-400 italic">❌ Mancante</span>
                                          ) : (
                                            <span className="break-words">{String(value)}</span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </CollapsibleContent>
                            </div>
                          </Collapsible>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            )}
          </Card>

          {/* Records Falliti */}
          <Card>
            <CardHeader className="cursor-pointer" onClick={() => setShowFailed(!showFailed)}>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  Records Falliti ({stats.failed})
                </div>
                <div className="flex items-center gap-2">
                  {selectedFailedRecords.size > 0 && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          processBatchFailedRecordsAI();
                        }}
                        disabled={processingAI.size > 0}
                        className="gap-2 border-purple-500/30 hover:bg-purple-500/10"
                      >
                        <Sparkles className="h-4 w-4 text-purple-500" />
                        AI Batch ({selectedFailedRecords.size})
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFailedRecords(Array.from(selectedFailedRecords));
                        }}
                        className="gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Elimina ({selectedFailedRecords.size})
                      </Button>
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelectAll();
                    }}
                  >
                    {selectedFailedRecords.size === failedRecords.length ? 'Deseleziona' : 'Seleziona tutti'}
                  </Button>
                  <Button variant="ghost" size="sm">
                    {showFailed ? 'Nascondi' : 'Mostra'}
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            {showFailed && (
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3 p-2">
                    {failedRecords.length === 0 ? (
                      <div className="text-muted-foreground text-center py-8">
                        Nessun record fallito
                      </div>
                     ) : (
                      <>
                        {failedRecords.map((error) => {
                          const isExpanded = expandedFailedRows.has(error.id);
                          const isSelected = selectedFailedRecords.has(error.id);
                          const isProcessing = processingAI.has(error.id);
                          const renderValue = (value: any) => {
                            if (value === null || value === undefined || value === '') {
                              return <span className="text-red-400 italic">❌ Mancante</span>;
                            }
                            return <span>{String(value)}</span>;
                          };

                          return (
                            <Collapsible
                              key={error.id}
                              open={isExpanded}
                              onOpenChange={(open) => {
                                setExpandedFailedRows(prev => {
                                  const newSet = new Set(prev);
                                  if (open) {
                                    newSet.add(error.id);
                                  } else {
                                    newSet.delete(error.id);
                                  }
                                  return newSet;
                                });
                              }}
                            >
                              <div className={cn(
                                "p-3 rounded-lg border transition-all duration-200",
                                isSelected 
                                  ? "border-red-500 ring-2 ring-red-500/50 bg-red-500/10 shadow-md" 
                                  : "border-red-500/30 bg-red-500/5 hover:bg-red-500/10",
                                "space-y-3"
                              )}>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => toggleSelectRecord(error.id)}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <Badge variant="outline" className="text-xs bg-red-500/20">
                                      Riga {error.row_number}
                                    </Badge>
                                    <div className="text-red-400 text-xs font-semibold">
                                      ❌ {error.error_message}
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-1 shrink-0">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0"
                                      title="Elimina record"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteFailedRecords([error.id]);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                    
                                    <CollapsibleTrigger asChild>
                                      <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="h-7 w-7 p-0"
                                        title="Mostra dati originali"
                                      >
                                        <FileText className="h-4 w-4" />
                                      </Button>
                                    </CollapsibleTrigger>
                                    
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0"
                                      title="Riprocessa con AI libera"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        processSingleRecordAI(error.id);
                                      }}
                                      disabled={isProcessing}
                                    >
                                      {isProcessing ? (
                                        <Activity className="h-4 w-4 animate-spin text-purple-500" />
                                      ) : (
                                        <Sparkles className="h-4 w-4 text-purple-500" />
                                      )}
                                    </Button>
                                  </div>
                                </div>

                              <CollapsibleContent className="mt-3">
                                <div className="p-3 rounded bg-black/20 border border-red-500/20">
                                  <div className="text-xs text-muted-foreground font-semibold mb-2">
                                    📄 Dati Originali Non Interpretati:
                                  </div>
                                  {error.raw_data && typeof error.raw_data === 'object' && (
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs font-mono">
                                      {Object.entries(error.raw_data).map(([key, value]) => (
                                        <div key={key} className="flex flex-col">
                                          <span className="text-muted-foreground font-semibold uppercase text-[10px]">
                                            {key.replace(/_/g, ' ')}
                                          </span>
                                          <div className="mt-1">
                                            {renderValue(value)}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </CollapsibleContent>

                              {error.ai_suggestions && typeof error.ai_suggestions === 'object' && (
                                <div className="mt-2 pt-2 border-t border-red-500/20">
                                  <div className="text-xs text-muted-foreground font-semibold mb-1">
                                    Suggerimenti AI:
                                  </div>
                                  <div className="text-xs text-red-300">
                                    {(error.ai_suggestions as any).reason || 'Nessun suggerimento disponibile'}
                                  </div>
                                </div>
                              )}
                              </div>
                            </Collapsible>
                          );
                        })}
                      </>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            )}
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