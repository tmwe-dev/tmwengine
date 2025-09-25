-- Rimuovo prima le dipendenze dalla tabella templates
ALTER TABLE public.import_logs 
DROP CONSTRAINT IF EXISTS import_logs_template_id_fkey;

ALTER TABLE public.import_logs 
DROP COLUMN IF EXISTS template_id;

-- Ora posso rimuovere la tabella templates
DROP TABLE IF EXISTS templates;

-- Creo tabella per i templates email
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  oggetto TEXT NOT NULL,
  contenuto TEXT NOT NULL,
  placeholder_disponibili JSONB DEFAULT '["nome_azienda", "responsabile", "email", "telefono", "indirizzo"]'::jsonb,
  attivo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Policies per email_templates
CREATE POLICY "Allow all operations on email_templates" 
ON public.email_templates 
FOR ALL 
USING (true);

-- Aggiungo colonne alla tabella import_logs per gestire tabelle temporanee
ALTER TABLE public.import_logs 
ADD COLUMN nome_tabella_temporanea TEXT,
ADD COLUMN contatti_selezionati INTEGER DEFAULT 0,
ADD COLUMN trasferiti_rubrica BOOLEAN DEFAULT false;

-- Trigger per aggiornare updated_at sui templates email
CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();