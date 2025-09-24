-- CRM Database Schema

-- Tabella Utenti
CREATE TABLE IF NOT EXISTS utenti (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  ruolo VARCHAR(50) CHECK (ruolo IN ('admin', 'commerciale', 'marketing', 'operativo')) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  telefono VARCHAR(50),
  permessi JSONB DEFAULT '{"lettura": true, "scrittura": false, "modifica": false}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella Rubrica
CREATE TABLE IF NOT EXISTS rubrica (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  responsabile VARCHAR(255) NOT NULL,
  azienda VARCHAR(255),
  email VARCHAR(255),
  telefono VARCHAR(50),
  indirizzo TEXT,
  cap VARCHAR(10),
  citta VARCHAR(100),
  provincia_stato VARCHAR(100),
  nazione VARCHAR(100),
  note TEXT,
  tag TEXT[],
  data_creazione TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella Campagne
CREATE TABLE IF NOT EXISTS campagne (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  obiettivo TEXT,
  inizio DATE,
  fine DATE,
  budget DECIMAL(10,2),
  stato VARCHAR(50) CHECK (stato IN ('attiva', 'pausa', 'completata')) DEFAULT 'attiva',
  max_email_giorno INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella Attività
CREATE TABLE IF NOT EXISTS attivita (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rubrica_id UUID REFERENCES rubrica(id) ON DELETE CASCADE,
  tipo VARCHAR(50) CHECK (tipo IN ('chiamata', 'meeting', 'email', 'task')) NOT NULL,
  descrizione TEXT NOT NULL,
  stato VARCHAR(50) CHECK (stato IN ('aperta', 'in_corso', 'completata', 'annullata')) DEFAULT 'aperta',
  scadenza TIMESTAMP WITH TIME ZONE,
  priorita VARCHAR(50) CHECK (priorita IN ('alta', 'media', 'bassa')) DEFAULT 'media',
  assegnato_a UUID REFERENCES utenti(id),
  creato_da UUID REFERENCES utenti(id),
  data_creazione TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella ponte Attività_Campagna
CREATE TABLE IF NOT EXISTS attivita_campagna (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campagna_id UUID REFERENCES campagne(id) ON DELETE CASCADE,
  attivita_id UUID REFERENCES attivita(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(campagna_id, attivita_id)
);

-- Tabella Email_Template
CREATE TABLE IF NOT EXISTS email_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  oggetto VARCHAR(500),
  corpo_html TEXT,
  tag_uso VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella Email
CREATE TABLE IF NOT EXISTS email (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rubrica_id UUID REFERENCES rubrica(id),
  campagna_id UUID REFERENCES campagne(id),
  oggetto VARCHAR(500),
  corpo_html TEXT,
  stato VARCHAR(50) CHECK (stato IN ('bozza', 'programmata', 'inviata', 'fallita', 'ricevuta')) DEFAULT 'bozza',
  direzione VARCHAR(50) CHECK (direzione IN ('inbound', 'outbound')) NOT NULL,
  bucket_ai VARCHAR(100),
  gruppo_ai VARCHAR(100),
  score_rilevanza DECIMAL(3,2) CHECK (score_rilevanza >= 0 AND score_rilevanza <= 1),
  inviata_da UUID REFERENCES utenti(id),
  inviata_il TIMESTAMP WITH TIME ZONE,
  ricevuta_il TIMESTAMP WITH TIME ZONE,
  tracciamento JSONB DEFAULT '{"aperture": 0, "click": 0}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella Allegati
CREATE TABLE IF NOT EXISTS allegati (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  riferimento_tipo VARCHAR(50) CHECK (riferimento_tipo IN ('Rubrica', 'Attivita', 'Email', 'Interazione')) NOT NULL,
  riferimento_id UUID NOT NULL,
  caricato_da UUID REFERENCES utenti(id),
  caricato_il TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella Interazioni
CREATE TABLE IF NOT EXISTS interazioni (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rubrica_id UUID REFERENCES rubrica(id) ON DELETE CASCADE,
  tipo VARCHAR(50) CHECK (tipo IN ('telefonata', 'email', 'riunione', 'nota')) NOT NULL,
  contenuto TEXT,
  data_ora TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  creato_da UUID REFERENCES utenti(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella Config_AI
CREATE TABLE IF NOT EXISTS config_ai (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(50) CHECK (provider IN ('chatgpt', 'claude', 'gemini')) NOT NULL,
  modello VARCHAR(100) NOT NULL,
  attivo BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella EmailProvider
CREATE TABLE IF NOT EXISTS email_provider (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo VARCHAR(50) DEFAULT 'smtp_webhook',
  attivo BOOLEAN DEFAULT false,
  dominio_invio VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella EmailProviderCredenziali
CREATE TABLE IF NOT EXISTS email_provider_credenziali (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES email_provider(id) ON DELETE CASCADE,
  campo VARCHAR(100) CHECK (campo IN ('api_key', 'webhook_secret', 'inbound_route', 'outbound_endpoint')) NOT NULL,
  valore TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(provider_id, campo)
);

-- Tabella EmailInboxWatch
CREATE TABLE IF NOT EXISTS email_inbox_watch (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES email_provider(id) ON DELETE CASCADE,
  casella VARCHAR(255) NOT NULL,
  stato VARCHAR(50) CHECK (stato IN ('attiva', 'errore')) DEFAULT 'attiva',
  ultimo_evento TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_rubrica_email ON rubrica(email);
CREATE INDEX IF NOT EXISTS idx_attivita_rubrica ON attivita(rubrica_id);
CREATE INDEX IF NOT EXISTS idx_attivita_stato ON attivita(stato);
CREATE INDEX IF NOT EXISTS idx_attivita_scadenza ON attivita(scadenza);
CREATE INDEX IF NOT EXISTS idx_email_rubrica ON email(rubrica_id);
CREATE INDEX IF NOT EXISTS idx_email_stato ON email(stato);
CREATE INDEX IF NOT EXISTS idx_email_direzione ON email(direzione);
CREATE INDEX IF NOT EXISTS idx_interazioni_rubrica ON interazioni(rubrica_id);
CREATE INDEX IF NOT EXISTS idx_allegati_riferimento ON allegati(riferimento_tipo, riferimento_id);

-- Triggers per updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_utenti_updated_at BEFORE UPDATE ON utenti FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_rubrica_updated_at BEFORE UPDATE ON rubrica FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_campagne_updated_at BEFORE UPDATE ON campagne FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_attivita_updated_at BEFORE UPDATE ON attivita FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_email_updated_at BEFORE UPDATE ON email FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_email_template_updated_at BEFORE UPDATE ON email_template FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_interazioni_updated_at BEFORE UPDATE ON interazioni FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_config_ai_updated_at BEFORE UPDATE ON config_ai FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_email_provider_updated_at BEFORE UPDATE ON email_provider FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER update_email_inbox_watch_updated_at BEFORE UPDATE ON email_inbox_watch FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();