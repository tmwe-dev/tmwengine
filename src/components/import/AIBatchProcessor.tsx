import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AIBatchProcessorProps {
  importLogId: string;
  totalRows: number;
  origin: string;
  onComplete: () => void;
}

const BATCH_SIZE = 50;

export function AIBatchProcessor({ importLogId, totalRows, origin, onComplete }: AIBatchProcessorProps) {
  const { toast } = useToast();
  const [processing, setProcessing] = useState(true);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [processedRows, setProcessedRows] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const totalBatches = Math.ceil(totalRows / BATCH_SIZE);
  const progress = (processedRows / totalRows) * 100;

  useEffect(() => {
    processBatch(0);
  }, []);

  const processBatch = async (offset: number) => {
    try {
      console.log(`Processing batch at offset ${offset}`);
      
      const { data, error } = await supabase.functions.invoke('process-ai-import', {
        body: {
          importLogId,
          mode: 'row_normalization',
          batchSize: BATCH_SIZE,
          offset,
          origin
        }
      });

      if (error) throw error;

      const result = data as any;
      
      if (result.success) {
        if (result.completed) {
          // All batches completed - generate final file
          toast({
            title: "✅ Normalizzazione completata!",
            description: "Generazione file finale in corso...",
          });

          try {
            const { data: fileData, error: fileError } = await supabase.functions.invoke(
              'generate-normalized-file',
              {
                body: { importLogId, mode: 'row_normalization' }
              }
            );

            if (fileError) throw fileError;

            setProcessing(false);
            toast({
              title: "🎉 Import completato!",
              description: `File normalizzato generato: ${fileData.file_name}`,
            });
            
            setTimeout(() => {
              onComplete();
            }, 2000);
          } catch (fileErr: any) {
            setError(`Errore generazione file: ${fileErr.message}`);
            setProcessing(false);
          }
        } else {
          // Update progress and process next batch
          setCurrentBatch(result.data.currentBatch);
          setProcessedRows(offset + result.data.processedRecords);
          
          // Process next batch
          setTimeout(() => {
            processBatch(result.data.nextOffset);
          }, 500);
        }
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (err: any) {
      console.error('Batch processing error:', err);
      setError(err.message || 'Errore durante la normalizzazione');
      setProcessing(false);
      
      toast({
        title: "Errore Normalizzazione",
        description: err.message,
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">AI Normalization in corso...</h3>
          {processing && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
          {!processing && !error && <CheckCircle2 className="w-5 h-5 text-green-500" />}
          {error && <AlertCircle className="w-5 h-5 text-destructive" />}
        </div>
        
        <p className="text-sm text-muted-foreground">
          Batch {currentBatch} di {totalBatches} • {processedRows.toLocaleString()} / {totalRows.toLocaleString()} record
        </p>
      </div>

      <div className="space-y-2">
        <Progress value={progress} className="h-2" />
        <p className="text-xs text-muted-foreground text-right">
          {progress.toFixed(1)}% completato
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="text-xs text-muted-foreground space-y-1 bg-muted/50 p-3 rounded">
        <p>⚡ <strong>Gemini Flash GRATIS</strong> fino al 6 Ottobre 2025</p>
        <p>🤖 L'AI analizza ogni record e identifica automaticamente i campi</p>
        <p>📊 Batch processing per evitare timeout su grandi volumi</p>
      </div>
    </Card>
  );
}
