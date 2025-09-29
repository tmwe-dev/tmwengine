-- Crea tabella per tracking del progresso di sincronizzazione
CREATE TABLE IF NOT EXISTS public.email_sync_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_log_id UUID REFERENCES public.email_sync_logs(id),
  folder_name TEXT NOT NULL,
  total_messages INTEGER NOT NULL DEFAULT 0,
  processed_messages INTEGER NOT NULL DEFAULT 0,
  current_batch INTEGER NOT NULL DEFAULT 0,
  batch_size INTEGER NOT NULL DEFAULT 50,
  status TEXT NOT NULL DEFAULT 'in_progress',
  last_offset INTEGER NOT NULL DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Abilita RLS
ALTER TABLE public.email_sync_progress ENABLE ROW LEVEL SECURITY;

-- Policy per permettere tutte le operazioni (temporaneo per sviluppo)
CREATE POLICY "Allow all operations on email_sync_progress" 
ON public.email_sync_progress 
FOR ALL 
USING (true);

-- Trigger per aggiornare updated_at
CREATE TRIGGER update_email_sync_progress_updated_at
BEFORE UPDATE ON public.email_sync_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Aggiungi colonne alla tabella email_sync_logs per migliorare il tracking
ALTER TABLE public.email_sync_logs 
ADD COLUMN IF NOT EXISTS total_batches INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS completed_batches INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_processed_offset INTEGER DEFAULT 0;