-- Crea tabella per gestire i templates
CREATE TABLE public.templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descrizione TEXT,
  tipo TEXT NOT NULL DEFAULT 'excel', -- excel, csv
  mapping_colonne JSONB NOT NULL, -- mapping tra colonne file e campi DB
  file_path TEXT, -- path del file template
  attivo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crea tabella per tracciare le importazioni
CREATE TABLE public.import_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES public.templates(id),
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  righe_totali INTEGER DEFAULT 0,
  righe_importate INTEGER DEFAULT 0,
  righe_errori INTEGER DEFAULT 0,
  stato TEXT NOT NULL DEFAULT 'in_corso', -- in_corso, completato, errore
  errori JSONB, -- dettagli errori se presenti
  utente_id TEXT, -- chi ha fatto l'importazione
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Abilita RLS per templates
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- Abilita RLS per import_logs  
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

-- Crea policies per templates (accesso completo per ora)
CREATE POLICY "Allow all operations on templates" 
ON public.templates 
FOR ALL 
USING (true);

-- Crea policies per import_logs (accesso completo per ora)
CREATE POLICY "Allow all operations on import_logs" 
ON public.import_logs 
FOR ALL 
USING (true);

-- Crea trigger per aggiornare updated_at su templates
CREATE TRIGGER update_templates_updated_at
BEFORE UPDATE ON public.templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Crea storage bucket per file di importazione
INSERT INTO storage.buckets (id, name, public) VALUES ('import-files', 'import-files', false);

-- Policies per il bucket import-files
CREATE POLICY "Tutti possono visualizzare file di importazione" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'import-files');

CREATE POLICY "Tutti possono caricare file di importazione" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'import-files');

CREATE POLICY "Tutti possono aggiornare file di importazione" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'import-files');

CREATE POLICY "Tutti possono eliminare file di importazione" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'import-files');

-- Inserisci alcuni template di esempio
INSERT INTO public.templates (nome, descrizione, tipo, mapping_colonne) VALUES 
(
  'Template Contatti Base',
  'Template standard per importazione contatti con campi base',
  'excel',
  '{
    "A": "responsabile",
    "B": "azienda", 
    "C": "email",
    "D": "telefono",
    "E": "tag",
    "F": "note"
  }'
),
(
  'Template CSV Clienti',
  'Template per file CSV con separatore virgola',
  'csv',
  '{
    "0": "responsabile",
    "1": "azienda",
    "2": "email", 
    "3": "telefono",
    "4": "ruolo",
    "5": "stato"
  }'
);