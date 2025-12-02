import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Play, Pause, Clock, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface ImportLog {
  id: string;
  file_name: string;
  righe_totali: number;
  righe_importate: number;
  righe_errori: number;
  stato: string;
  created_at: string;
  completed_at: string | null;
  errori: any;
}

interface ImportProgressMonitorProps {
  importLogId?: string;
  onComplete?: () => void;
}

export function ImportProgressMonitor({ importLogId, onComplete }: ImportProgressMonitorProps) {
  const [importLog, setImportLog] = useState<ImportLog | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [timeoutSettings, setTimeoutSettings] = useState({
    maxProcessingTime: 100, // secondi
    batchSize: 100
  });
  const [autoResume, setAutoResume] = useState(true);

  // Calcola la percentuale di progresso
  const getProgress = () => {
    if (!importLog || !importLog.righe_totali) return 0;
    const processed = (importLog.righe_importate + importLog.righe_errori);
    return Math.round((processed / importLog.righe_totali) * 100);
  };

  // Stato dell'importazione
  const getStatusInfo = () => {
    if (!importLog) return { color: 'secondary', icon: Clock, text: 'In attesa...' };
    
    switch (importLog.stato) {
      case 'file_salvato':
      case 'pronto_per_elaborazione':
        return { color: 'secondary', icon: Clock, text: 'Pronto per elaborazione' };
      case 'elaborazione':
        return { color: 'default', icon: Loader2, text: 'Elaborazione in corso...' };
      case 'completato':
        return { color: 'success', icon: CheckCircle, text: 'Completato' };
      case 'completato_con_errori':
        return { color: 'warning', icon: AlertCircle, text: 'Completato con errori' };
      default:
        return { color: 'secondary', icon: Clock, text: importLog.stato };
    }
  };

  // Chiama l'edge function AI per continuare l'elaborazione
  const resumeProcessing = async () => {
    if (!importLogId) return;
    
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-ai-import', {
        body: { 
          importLogId,
          aiPrompt: 'Continua l\'elaborazione dei dati importati.'
        }
      });

      if (error) throw error;

      console.log('Processing resumed:', data);
      
      if (data?.data?.isComplete) {
        toast({
          title: "Importazione completata",
          description: `Importati ${data.data.validRecords} record con ${data.data.errorRows} errori.`,
        });
        onComplete?.();
      } else if (autoResume && data?.data?.processedRows < data?.data?.totalRows) {
        // Se auto-resume è attivo e non è completato, riprendi dopo un breve delay
        setTimeout(() => {
          if (importLog?.stato === 'elaborazione') {
            resumeProcessing();
          }
        }, 2000);
      }
    } catch (error: any) {
      console.error('Error resuming processing:', error);
      toast({
        title: "Errore nell'elaborazione",
        description: error.message || "Errore sconosciuto",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Monitora i cambiamenti real-time
  useEffect(() => {
    if (!importLogId) return;

    // Carica i dati iniziali
    const loadInitialData = async () => {
      const { data, error } = await supabase
        .from('import_logs')
        .select('*')
        .eq('id', importLogId)
        .single();

      if (data && !error) {
        setImportLog(data);
        
        // Notifica iniziale
        if (data.stato === 'elaborazione') {
          toast({
            title: "Importazione in corso",
            description: `Elaborazione del file ${data.file_name}...`,
          });
        }
      }
    };

    loadInitialData();

    // Configura real-time subscription
    const channel = supabase
      .channel('import_progress')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'import_logs',
          filter: `id=eq.${importLogId}`
        },
        (payload) => {
          const newData = payload.new as ImportLog;
          const oldData = importLog;
          
          setImportLog(newData);
          
          // Notifiche sui cambiamenti di stato
          if (oldData && newData.stato !== oldData.stato) {
            switch (newData.stato) {
              case 'elaborazione':
                toast({
                  title: "Elaborazione avviata",
                  description: `Inizio elaborazione ${newData.file_name}`,
                });
                break;
              case 'completato':
                toast({
                  title: "Importazione completata! ✅",
                  description: `${newData.righe_importate} record importati con successo`,
                });
                onComplete?.();
                break;
              case 'completato_con_errori':
                toast({
                  title: "Importazione completata con errori ⚠️",
                  description: `${newData.righe_importate} importati, ${newData.righe_errori} errori`,
                  variant: "destructive",
                });
                onComplete?.();
                break;
            }
          }
          
          // Notifiche di progresso (ogni 10%)
          if (oldData && newData.righe_importate > oldData.righe_importate) {
            const oldProgress = Math.floor((oldData.righe_importate / oldData.righe_totali) * 10);
            const newProgress = Math.floor((newData.righe_importate / newData.righe_totali) * 10);
            
            if (newProgress > oldProgress) {
              toast({
                title: `Progresso: ${newProgress * 10}%`,
                description: `${newData.righe_importate}/${newData.righe_totali} record elaborati`,
              });
            }
          }

          // Auto-resume se necessario
          if (autoResume && newData.stato === 'elaborazione' && !isProcessing) {
            const totalProcessed = newData.righe_importate + newData.righe_errori;
            if (totalProcessed < newData.righe_totali) {
              setTimeout(() => resumeProcessing(), 3000);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [importLogId, autoResume, isProcessing]);

  if (!importLog) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Caricamento stato importazione...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusInfo = getStatusInfo();
  const progress = getProgress();
  const StatusIcon = statusInfo.icon;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Monitoraggio Importazione</span>
          <Badge variant={statusInfo.color as any}>
            <StatusIcon className={`h-3 w-3 mr-1 ${statusInfo.icon === Loader2 ? 'animate-spin' : ''}`} />
            {statusInfo.text}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Informazioni file */}
        <div className="space-y-2">
          <div className="text-sm font-medium">File: {importLog.file_name}</div>
          <div className="text-sm text-muted-foreground">
            Creato il: {new Date(importLog.created_at).toLocaleString('it-IT')}
          </div>
          {importLog.completed_at && (
            <div className="text-sm text-muted-foreground">
              Completato il: {new Date(importLog.completed_at).toLocaleString('it-IT')}
            </div>
          )}
        </div>

        {/* Barra di progresso */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progresso</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="w-full" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Importati: {importLog.righe_importate}</span>
            <span>Errori: {importLog.righe_errori}</span>
            <span>Totale: {importLog.righe_totali}</span>
          </div>
        </div>

        {/* Controlli timeout e batch */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="timeout">Timeout (secondi)</Label>
            <Input
              id="timeout"
              type="number"
              min="30"
              max="300"
              value={timeoutSettings.maxProcessingTime}
              onChange={(e) => setTimeoutSettings(prev => ({
                ...prev,
                maxProcessingTime: parseInt(e.target.value) || 100
              }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="batchSize">Dimensione batch</Label>
            <Input
              id="batchSize"
              type="number"
              min="50"
              max="500"
              value={timeoutSettings.batchSize}
              onChange={(e) => setTimeoutSettings(prev => ({
                ...prev,
                batchSize: parseInt(e.target.value) || 100
              }))}
            />
          </div>
        </div>

        {/* Controlli */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="autoResume"
              checked={autoResume}
              onChange={(e) => setAutoResume(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="autoResume" className="text-sm">
              Ripresa automatica
            </Label>
          </div>
          
          {importLog.stato === 'elaborazione' && (
            <Button
              onClick={resumeProcessing}
              disabled={isProcessing}
              className="flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Elaborazione...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Continua elaborazione
                </>
              )}
            </Button>
          )}
          
          {(importLog.stato === 'pronto_per_elaborazione' || importLog.stato === 'file_salvato') && (
            <Button
              onClick={resumeProcessing}
              disabled={isProcessing}
              className="flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Avvio...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Avvia elaborazione
                </>
              )}
            </Button>
          )}
        </div>

        {/* Errori */}
        {importLog.errori && (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-destructive">Errori rilevati:</Label>
            <div className="text-xs text-muted-foreground bg-muted p-2 rounded max-h-20 overflow-y-auto">
              <pre>{JSON.stringify(importLog.errori, null, 2)}</pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}