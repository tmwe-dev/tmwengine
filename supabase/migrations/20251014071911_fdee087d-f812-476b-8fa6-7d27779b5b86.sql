-- Crea tabella campagne
CREATE TABLE IF NOT EXISTS public.campagne (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  obiettivo text,
  inizio date,
  fine date,
  budget numeric,
  stato text DEFAULT 'bozza' CHECK (stato IN ('bozza', 'attiva', 'completata', 'sospesa')),
  max_email_giorno integer DEFAULT 100,
  ora_inizio time,
  ora_fine time,
  frequenza_tipo text DEFAULT 'giornaliera' CHECK (frequenza_tipo IN ('giornaliera', 'oraria', 'minuti')),
  frequenza_valore integer,
  max_email_ora integer,
  stato_invio text DEFAULT 'non_iniziata' CHECK (stato_invio IN ('non_iniziata', 'in_corso', 'completata', 'sospesa', 'errore')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Abilita RLS
ALTER TABLE public.campagne ENABLE ROW LEVEL SECURITY;

-- Policy per permettere tutte le operazioni (personalizza in base alle tue esigenze)
CREATE POLICY "Allow all operations on campagne"
  ON public.campagne
  FOR ALL
  USING (true);

-- Trigger per updated_at
CREATE TRIGGER update_campagne_updated_at
  BEFORE UPDATE ON public.campagne
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Aggiungi colonna campagna_id alla tabella attivita
ALTER TABLE public.attivita
ADD COLUMN IF NOT EXISTS campagna_id uuid REFERENCES public.campagne(id) ON DELETE SET NULL;

-- Crea indice per migliorare performance query filtrate per campagna
CREATE INDEX IF NOT EXISTS idx_attivita_campagna_id ON public.attivita(campagna_id);

-- Crea indice per query scheduler (campagna_id + stato)
CREATE INDEX IF NOT EXISTS idx_attivita_campagna_stato ON public.attivita(campagna_id, stato) WHERE campagna_id IS NOT NULL;