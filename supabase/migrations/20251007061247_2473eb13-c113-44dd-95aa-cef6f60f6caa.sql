-- Crea tabella per tracciare gli errori di importazione
CREATE TABLE public.import_errors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  import_log_id UUID NOT NULL REFERENCES public.import_logs(id) ON DELETE CASCADE,
  row_number INTEGER,
  raw_data JSONB NOT NULL,
  error_message TEXT,
  error_type TEXT,
  attempted_corrections INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  corrected_data JSONB,
  ai_suggestions JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Abilita RLS
ALTER TABLE public.import_errors ENABLE ROW LEVEL SECURITY;

-- Policy per permettere tutte le operazioni (come le altre tabelle del sistema)
CREATE POLICY "Allow all operations on import_errors"
ON public.import_errors
FOR ALL
USING (true);

-- Indice per velocizzare le query
CREATE INDEX idx_import_errors_import_log_id ON public.import_errors(import_log_id);
CREATE INDEX idx_import_errors_status ON public.import_errors(status);

-- Trigger per aggiornare updated_at
CREATE TRIGGER update_import_errors_updated_at
BEFORE UPDATE ON public.import_errors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Aggiungi commenti per documentazione
COMMENT ON TABLE public.import_errors IS 'Traccia i record errati durante importazione con possibilità di rielaborazione AI';
COMMENT ON COLUMN public.import_errors.status IS 'pending, processing, corrected, failed';
COMMENT ON COLUMN public.import_errors.error_type IS 'validation, format, missing_required, etc.';