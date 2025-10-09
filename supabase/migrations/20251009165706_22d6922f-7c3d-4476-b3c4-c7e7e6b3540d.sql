-- Abilita estensioni necessarie
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Crea tabella per la coda delle email
CREATE TABLE IF NOT EXISTS public.email_campagne_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Dati destinatario
  destinatario_email TEXT NOT NULL,
  destinatario_nome TEXT,
  destinatario_azienda TEXT,
  destinatario_rubrica_id UUID,
  
  -- Contenuto email
  oggetto TEXT NOT NULL,
  corpo_testo TEXT NOT NULL,
  corpo_html TEXT,
  
  -- Stato e tracking
  stato TEXT DEFAULT 'programmata', -- 'programmata', 'in_coda', 'in_invio', 'inviata', 'errore', 'annullata', 'in_pausa'
  priorita INTEGER DEFAULT 0,
  tentativi_invio INTEGER DEFAULT 0,
  max_tentativi INTEGER DEFAULT 3,
  
  -- Pianificazione temporale
  data_ora_programmata TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  intervallo_minuti INTEGER DEFAULT 2,
  
  -- Timestamp invio effettivo
  data_ora_invio TIMESTAMP WITH TIME ZONE,
  
  -- Risultati
  message_id TEXT,
  errore_dettaglio TEXT,
  
  -- Metadata
  campagna_nome TEXT NOT NULL,
  creato_da UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_email_campagne_stato ON public.email_campagne_queue(stato);
CREATE INDEX IF NOT EXISTS idx_email_campagne_data_programmata ON public.email_campagne_queue(data_ora_programmata);
CREATE INDEX IF NOT EXISTS idx_email_campagne_campagna_nome ON public.email_campagne_queue(campagna_nome);
CREATE INDEX IF NOT EXISTS idx_email_campagne_created_at ON public.email_campagne_queue(created_at DESC);

-- RLS Policy
ALTER TABLE public.email_campagne_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on email_campagne_queue" ON public.email_campagne_queue
  FOR ALL USING (true) WITH CHECK (true);

-- Trigger per updated_at
CREATE TRIGGER update_email_campagne_queue_updated_at
  BEFORE UPDATE ON public.email_campagne_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Abilita realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_campagne_queue;

-- Crea cron job che chiama la funzione ogni 2 minuti
SELECT cron.schedule(
  'email-campagne-scheduler-job',
  '*/2 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://dlldkrzoxvjxpgkkttxu.supabase.co/functions/v1/email-campagne-scheduler',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbGRrcnpveHZqeHBna2t0dHh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MjA1ODQsImV4cCI6MjA3NDI5NjU4NH0.PrHXldlTqbNm63S90_Wo4bFcFeSBMVeSxjJpUxoKf5A"}'::jsonb,
      body := '{"trigger": "cron"}'::jsonb
    ) as request_id;
  $$
);