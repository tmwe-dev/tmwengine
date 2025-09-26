-- Crea tabella per salvare i file grezzi prima dell'elaborazione
CREATE TABLE public.file_imports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_content TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  separator_detected TEXT,
  headers_detected JSONB,
  total_rows INTEGER DEFAULT 0,
  stato TEXT NOT NULL DEFAULT 'salvato',
  import_log_id UUID REFERENCES public.import_logs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Abilita RLS
ALTER TABLE public.file_imports ENABLE ROW LEVEL SECURITY;

-- Crea policy per permettere tutte le operazioni
CREATE POLICY "Allow all operations on file_imports" 
ON public.file_imports 
FOR ALL 
USING (true);

-- Aggiungi trigger per aggiornare updated_at
CREATE TRIGGER update_file_imports_updated_at
BEFORE UPDATE ON public.file_imports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();