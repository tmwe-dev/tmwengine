-- Aggiungi sistema archiviazione per file e log
ALTER TABLE public.file_imports 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS backup_file_path TEXT;

ALTER TABLE public.import_logs 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Aggiungi riferimento al file finale generato
ALTER TABLE public.import_logs
ADD COLUMN IF NOT EXISTS final_file_path TEXT,
ADD COLUMN IF NOT EXISTS final_file_id UUID REFERENCES public.file_imports(id);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_file_imports_archived ON public.file_imports(archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_file_imports_deleted ON public.file_imports(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_import_logs_archived ON public.import_logs(archived_at) WHERE archived_at IS NOT NULL;