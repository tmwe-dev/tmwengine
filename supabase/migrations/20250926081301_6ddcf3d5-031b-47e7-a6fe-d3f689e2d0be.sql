-- Aggiorna la tabella email_provider per supportare IMAP/SMTP
ALTER TABLE public.email_provider 
ADD COLUMN tipo_provider text CHECK (tipo_provider IN ('api', 'smtp_imap')) DEFAULT 'api',
ADD COLUMN smtp_server text,
ADD COLUMN smtp_porta integer DEFAULT 587,
ADD COLUMN smtp_sicurezza text CHECK (smtp_sicurezza IN ('none', 'tls', 'ssl')) DEFAULT 'tls',
ADD COLUMN imap_server text,
ADD COLUMN imap_porta integer DEFAULT 993,
ADD COLUMN imap_sicurezza text CHECK (imap_sicurezza IN ('none', 'tls', 'ssl')) DEFAULT 'ssl',
ADD COLUMN email_username text,
ADD COLUMN intervallo_sync_minuti integer DEFAULT 5,
ADD COLUMN cartella_inbox text DEFAULT 'INBOX',
ADD COLUMN cartella_sent text DEFAULT 'Sent',
ADD COLUMN max_email_sync integer DEFAULT 50;

-- Aggiorna la tabella credenziali per supportare password email
ALTER TABLE public.email_provider_credenziali
ADD COLUMN email_password text,
ADD COLUMN oauth_token text,
ADD COLUMN oauth_refresh_token text;

-- Crea tabella per gestire i messaggi email sincronizzati
CREATE TABLE public.email_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id uuid NOT NULL REFERENCES public.email_provider(id) ON DELETE CASCADE,
  message_id text NOT NULL,
  subject text,
  from_email text NOT NULL,
  to_email text NOT NULL,
  cc_email text,
  bcc_email text,
  body_text text,
  body_html text,
  data_ricezione timestamp with time zone NOT NULL,
  data_invio timestamp with time zone,
  direzione text NOT NULL CHECK (direzione IN ('inbound', 'outbound')),
  stato text NOT NULL DEFAULT 'nuovo' CHECK (stato IN ('nuovo', 'letto', 'risposto', 'archiviato')),
  cartella text DEFAULT 'INBOX',
  flags jsonb DEFAULT '[]'::jsonb,
  attachments jsonb DEFAULT '[]'::jsonb,
  raw_headers jsonb,
  thread_id text,
  in_reply_to text,
  email_references text,
  message_hash text UNIQUE,
  sync_status text DEFAULT 'sincronizzato' CHECK (sync_status IN ('sincronizzato', 'errore', 'in_corso')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Crea indici per migliorare le performance
CREATE INDEX idx_email_messages_provider_id ON public.email_messages(provider_id);
CREATE INDEX idx_email_messages_message_id ON public.email_messages(message_id);
CREATE INDEX idx_email_messages_from_email ON public.email_messages(from_email);
CREATE INDEX idx_email_messages_data_ricezione ON public.email_messages(data_ricezione DESC);
CREATE INDEX idx_email_messages_direzione ON public.email_messages(direzione);
CREATE INDEX idx_email_messages_stato ON public.email_messages(stato);
CREATE INDEX idx_email_messages_thread_id ON public.email_messages(thread_id);

-- Abilita RLS per sicurezza
ALTER TABLE public.email_messages ENABLE ROW LEVEL SECURITY;

-- Crea policy per permettere tutte le operazioni
CREATE POLICY "Allow all operations on email_messages" 
ON public.email_messages 
FOR ALL 
USING (true);

-- Crea tabella per i log di sincronizzazione
CREATE TABLE public.email_sync_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id uuid NOT NULL REFERENCES public.email_provider(id) ON DELETE CASCADE,
  sync_start timestamp with time zone NOT NULL DEFAULT now(),
  sync_end timestamp with time zone,
  messaggi_sincronizzati integer DEFAULT 0,
  messaggi_nuovi integer DEFAULT 0,
  messaggi_aggiornati integer DEFAULT 0,
  errori jsonb DEFAULT '[]'::jsonb,
  stato text NOT NULL DEFAULT 'in_corso' CHECK (stato IN ('in_corso', 'completato', 'errore')),
  tipo_sync text NOT NULL CHECK (tipo_sync IN ('manuale', 'automatico', 'iniziale')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Abilita RLS per i log di sync
ALTER TABLE public.email_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on email_sync_logs" 
ON public.email_sync_logs 
FOR ALL 
USING (true);

-- Trigger per aggiornare updated_at
CREATE TRIGGER update_email_messages_updated_at
BEFORE UPDATE ON public.email_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Aggiungi constraint per evitare duplicati di messaggi
ALTER TABLE public.email_messages 
ADD CONSTRAINT unique_provider_message_id 
UNIQUE (provider_id, message_id);