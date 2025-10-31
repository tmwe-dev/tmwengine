-- Tabella classificazioni AI email
CREATE TABLE email_ai_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_message_id UUID REFERENCES email_messages(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  
  -- Classificazione AI
  category TEXT NOT NULL,
  confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  ai_summary TEXT,
  keywords TEXT[],
  
  -- Metadata mittente
  sender_email TEXT NOT NULL,
  sender_domain TEXT NOT NULL,
  sender_logo_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(email_message_id, user_email)
);

-- Indici per performance
CREATE INDEX idx_email_ai_category ON email_ai_classifications(category);
CREATE INDEX idx_email_ai_sender ON email_ai_classifications(sender_email);
CREATE INDEX idx_email_ai_user ON email_ai_classifications(user_email);
CREATE INDEX idx_email_ai_message_id ON email_ai_classifications(email_message_id);

-- Tabella cache loghi aziendali
CREATE TABLE company_logos_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  company_name TEXT,
  last_fetched_at TIMESTAMPTZ DEFAULT NOW(),
  fetch_attempts INT DEFAULT 0 CHECK (fetch_attempts <= 3),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_logos_domain ON company_logos_cache(domain);

-- Trigger per aggiornare updated_at
CREATE OR REPLACE FUNCTION update_email_ai_classifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_email_ai_classifications_updated_at
  BEFORE UPDATE ON email_ai_classifications
  FOR EACH ROW
  EXECUTE FUNCTION update_email_ai_classifications_updated_at();

-- RLS Policies
ALTER TABLE email_ai_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_logos_cache ENABLE ROW LEVEL SECURITY;

-- Policy: utenti possono vedere solo le loro classificazioni
CREATE POLICY "Users can view their own email classifications"
  ON email_ai_classifications
  FOR SELECT
  USING (auth.uid()::text = user_email OR user_email IN (
    SELECT tmwe_email FROM user_profiles WHERE user_id = auth.uid()
  ));

-- Policy: utenti possono inserire proprie classificazioni
CREATE POLICY "Users can insert their own email classifications"
  ON email_ai_classifications
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_email OR user_email IN (
    SELECT tmwe_email FROM user_profiles WHERE user_id = auth.uid()
  ));

-- Policy: utenti possono aggiornare proprie classificazioni
CREATE POLICY "Users can update their own email classifications"
  ON email_ai_classifications
  FOR UPDATE
  USING (auth.uid()::text = user_email OR user_email IN (
    SELECT tmwe_email FROM user_profiles WHERE user_id = auth.uid()
  ));

-- Policy: tutti possono leggere cache loghi (pubblici)
CREATE POLICY "Anyone can view logo cache"
  ON company_logos_cache
  FOR SELECT
  USING (true);

-- Policy: service role può gestire cache loghi
CREATE POLICY "Service role can manage logo cache"
  ON company_logos_cache
  FOR ALL
  USING (auth.role() = 'service_role');