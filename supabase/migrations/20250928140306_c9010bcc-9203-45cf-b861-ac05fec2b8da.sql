-- Aggiungi campi per gestione avanzata attività
ALTER TABLE public.attivita 
ADD COLUMN IF NOT EXISTS note TEXT,
ADD COLUMN IF NOT EXISTS modifiche_log JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS data_ultima_modifica TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ora_creazione TIME,
ADD COLUMN IF NOT EXISTS selezionata BOOLEAN DEFAULT false;

-- Aggiorna il trigger per data_ultima_modifica
CREATE OR REPLACE FUNCTION public.update_attivita_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    NEW.data_ultima_modifica = now();
    
    -- Se è un aggiornamento, aggiungi al log delle modifiche
    IF TG_OP = 'UPDATE' THEN
        NEW.modifiche_log = COALESCE(OLD.modifiche_log, '[]'::jsonb) || 
        jsonb_build_object(
            'timestamp', now(),
            'campo_modificato', 'vari',
            'valore_precedente', row_to_json(OLD)::jsonb,
            'valore_nuovo', row_to_json(NEW)::jsonb
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Crea trigger per attivita
DROP TRIGGER IF EXISTS update_attivita_updated_at ON public.attivita;
CREATE TRIGGER update_attivita_updated_at
    BEFORE UPDATE ON public.attivita
    FOR EACH ROW
    EXECUTE FUNCTION public.update_attivita_timestamps();

-- Aggiorna le attività esistenti con ora_creazione se non presente
UPDATE public.attivita 
SET ora_creazione = created_at::time
WHERE ora_creazione IS NULL;

-- Indici semplici senza funzioni per le performance
CREATE INDEX IF NOT EXISTS idx_attivita_scadenza ON public.attivita(scadenza);
CREATE INDEX IF NOT EXISTS idx_attivita_created_at ON public.attivita(created_at);
CREATE INDEX IF NOT EXISTS idx_attivita_stato_scadenza ON public.attivita(stato, scadenza);