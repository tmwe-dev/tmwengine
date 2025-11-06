/**
 * AI Categorization Progress Dialog
 * Real-time progress tracking con cancel support
 */

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, Loader2 } from 'lucide-react';

interface AICategorizationProgressDialogProps {
  open: boolean;
  batchId: string | null;
  onClose: () => void;
  onComplete: () => void;
}

export function AICategorizationProgressDialog({
  open,
  batchId,
  onClose,
  onComplete,
}: AICategorizationProgressDialogProps) {
  const [processed, setProcessed] = useState(0);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<'processing' | 'completed' | 'cancelled' | 'failed'>('processing');
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (!open || !batchId) return;

    // Polling ogni 2 secondi
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('ai_categorization_progress')
        .select('*')
        .eq('batch_id', batchId)
        .single();

      if (data) {
        setProcessed(data.processed_count);
        setTotal(data.total_count);
        setStatus(data.status as any);

        if (data.status === 'completed' || data.status === 'cancelled' || data.status === 'failed') {
          clearInterval(interval);
          if (data.status === 'completed') {
            onComplete();
          }
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [open, batchId, onComplete]);

  const handleCancel = async () => {
    if (!batchId) return;
    
    setIsCancelling(true);
    
    // Aggiorna stato a cancelled
    await supabase
      .from('ai_categorization_progress')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
      })
      .eq('batch_id', batchId);

    setIsCancelling(false);
    setStatus('cancelled');
  };

  const progressPercentage = total > 0 ? (processed / total) * 100 : 0;
  const BATCH_SIZE = 3;
  const currentBatch = processed > 0 ? Math.floor(processed / BATCH_SIZE) : 0;
  const totalBatches = total > 0 ? Math.ceil(total / BATCH_SIZE) : 0;
  const estimatedTimeRemaining = total > 0 && processed > 0
    ? Math.ceil((total - processed) * 7) // ~7 sec per sender (API call + processing)
    : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Analisi AI in corso...
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Progress bar */}
          <div className="space-y-2">
            <Progress value={progressPercentage} className="h-3" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {processed} / {total} mittenti elaborati
              </span>
              <span className="font-medium">
                {progressPercentage.toFixed(0)}%
              </span>
            </div>
            {/* Batch info */}
            {status === 'processing' && totalBatches > 1 && (
              <p className="text-xs text-center text-muted-foreground">
                📦 Batch {currentBatch} / {totalBatches} completato
              </p>
            )}
          </div>

          {/* Tempo stimato */}
          {estimatedTimeRemaining && status === 'processing' && (
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>
                Tempo stimato rimanente: ~{Math.ceil(estimatedTimeRemaining / 60)} min
                {estimatedTimeRemaining < 120 && ` (${estimatedTimeRemaining}s)`}
              </span>
            </div>
          )}

          {/* Status messages */}
          {status === 'completed' && (
            <div className="rounded-lg bg-green-500/10 p-3 text-center text-sm text-green-600 dark:text-green-400">
              ✅ Analisi completata con successo!
            </div>
          )}

          {status === 'cancelled' && (
            <div className="rounded-lg bg-orange-500/10 p-3 text-center text-sm text-orange-600 dark:text-orange-400">
              🛑 Analisi annullata dall'utente
            </div>
          )}

          {status === 'failed' && (
            <div className="rounded-lg bg-red-500/10 p-3 text-center text-sm text-red-600 dark:text-red-400">
              ❌ Errore durante l'analisi
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between gap-2">
            {status === 'processing' ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-muted-foreground"
                >
                  Nascondi
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isCancelling}
                >
                  {isCancelling ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Annullamento...
                    </>
                  ) : (
                    '🛑 Annulla'
                  )}
                </Button>
              </>
            ) : (
              <Button
                className="w-full"
                onClick={onClose}
              >
                Chiudi
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
