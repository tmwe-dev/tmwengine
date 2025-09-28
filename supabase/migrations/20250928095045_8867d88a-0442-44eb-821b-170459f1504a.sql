-- Aggiorna configurazione email provider con valori sicurezza corretti
UPDATE email_provider 
SET 
  imap_sicurezza = 'none',
  smtp_sicurezza = 'none',
  outbound_endpoint = 'https://api.tmwe.it/v1/send',
  inbound_route = '/api/email/inbound'
WHERE provider = 'TMWE';

-- Crea tabella per configurazioni SSL avanzate
CREATE TABLE IF NOT EXISTS email_ssl_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL,
  accept_self_signed BOOLEAN NOT NULL DEFAULT false,
  verify_hostname BOOLEAN NOT NULL DEFAULT false,
  ca_bundle TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Abilita RLS
ALTER TABLE email_ssl_config ENABLE ROW LEVEL SECURITY;

-- Policy per accesso completo
CREATE POLICY "Allow all operations on email_ssl_config" 
ON email_ssl_config 
FOR ALL 
USING (true);

-- Inserisci configurazione SSL per TMWE che accetta certificati auto-firmati
INSERT INTO email_ssl_config (provider_id, accept_self_signed, verify_hostname)
SELECT id, true, false 
FROM email_provider 
WHERE provider = 'TMWE'
ON CONFLICT DO NOTHING;

-- Trigger per timestamp
CREATE TRIGGER update_email_ssl_config_updated_at
BEFORE UPDATE ON email_ssl_config
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();