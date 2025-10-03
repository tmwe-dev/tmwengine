-- Tabella per dati normalizzati dall'AI
CREATE TABLE public.temp_ai_reviewed (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  import_log_id UUID REFERENCES public.import_logs(id) ON DELETE CASCADE,
  row_number INTEGER,
  raw_data JSONB NOT NULL,
  normalized_data JSONB,
  validation_status TEXT DEFAULT 'pending',
  validation_errors JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Aggiungi colonna per tracking batch processing
ALTER TABLE public.import_logs 
ADD COLUMN IF NOT EXISTS processing_batch INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_batches INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_batch_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS normalization_method TEXT DEFAULT 'column_mapping';

-- Indici per performance
CREATE INDEX idx_temp_ai_reviewed_import_log ON public.temp_ai_reviewed(import_log_id);
CREATE INDEX idx_temp_ai_reviewed_status ON public.temp_ai_reviewed(validation_status);

-- RLS
ALTER TABLE public.temp_ai_reviewed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on temp_ai_reviewed" 
ON public.temp_ai_reviewed 
FOR ALL 
USING (true);