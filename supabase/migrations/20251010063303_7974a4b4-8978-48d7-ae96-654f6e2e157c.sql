-- STEP 1: Assegna ruolo admin a luca@tmwe.it
INSERT INTO user_roles (user_id, role)
SELECT user_id, 'admin'::app_role
FROM user_profiles
WHERE tmwe_email = 'luca@tmwe.it'
ON CONFLICT (user_id, role) DO NOTHING;

-- STEP 5A: Crea tabelle per email aziendali condivise
CREATE TABLE IF NOT EXISTS shared_email_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shared_email_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_email_id UUID REFERENCES shared_email_accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  can_send BOOLEAN DEFAULT true,
  can_read BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(shared_email_id, user_id)
);

-- STEP 5B: Aggiungi colonne per email condivise
ALTER TABLE email_messages 
ADD COLUMN IF NOT EXISTS is_shared_email BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS shared_email_id UUID REFERENCES shared_email_accounts(id);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_email_shared 
ON email_messages(shared_email_id) 
WHERE shared_email_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_user_email 
ON email_messages(user_email);

-- RLS Policies per tabelle condivise
ALTER TABLE shared_email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_email_members ENABLE ROW LEVEL SECURITY;

-- Policy: Tutti gli utenti autenticati possono vedere le email condivise attive
CREATE POLICY "Users can view shared email accounts"
ON shared_email_accounts FOR SELECT
TO authenticated
USING (is_active = true);

-- Policy: Solo admin possono gestire email condivise
CREATE POLICY "Admins can manage shared email accounts"
ON shared_email_accounts FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Policy: Utenti vedono solo i loro membri
CREATE POLICY "Users can view their shared email memberships"
ON shared_email_members FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: Admin possono gestire membri
CREATE POLICY "Admins can manage shared email members"
ON shared_email_members FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- STEP 5C: Nuova RLS Policy per email condivise
CREATE POLICY "Users can view shared emails"
ON email_messages FOR SELECT
TO authenticated
USING (
  user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR user_email = (SELECT tmwe_email FROM user_profiles WHERE user_id = auth.uid())
  OR (
    is_shared_email = true 
    AND EXISTS (
      SELECT 1 FROM shared_email_members 
      WHERE shared_email_id = email_messages.shared_email_id 
      AND user_id = auth.uid()
      AND can_read = true
    )
  )
);

-- Inserisci email aziendali iniziali
INSERT INTO shared_email_accounts (email, display_name, description) VALUES
  ('booking@tmwe.it', 'Booking TMWE', 'Email per prenotazioni e preventivi'),
  ('info@tmwe.it', 'Info TMWE', 'Email informazioni generali'),
  ('booking@tmwe.us', 'Booking TMWE US', 'Email booking ufficio USA')
ON CONFLICT (email) DO NOTHING;