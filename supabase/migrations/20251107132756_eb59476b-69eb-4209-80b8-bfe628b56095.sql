-- MIGRATION: Isolamento email_sender_groups per utente
-- Data: 2025-01-07
-- Descrizione: Aggiunge user_id e implementa RLS per isolare gruppi tra utenti

-- Step 1: Aggiungere colonna user_id
ALTER TABLE email_sender_groups 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2: Popolare user_id per gruppi esistenti (assegnare all'utente Luca)
UPDATE email_sender_groups 
SET user_id = (
  SELECT user_id 
  FROM user_profiles 
  WHERE tmwe_email = 'luca@tmwe.it' 
  LIMIT 1
)
WHERE user_id IS NULL;

-- Step 3: Rendere user_id obbligatorio
ALTER TABLE email_sender_groups 
ALTER COLUMN user_id SET NOT NULL;

-- Step 4: Rimuovere policy permissive esistenti
DROP POLICY IF EXISTS "Everyone can view groups" ON email_sender_groups;
DROP POLICY IF EXISTS "Everyone can insert groups" ON email_sender_groups;
DROP POLICY IF EXISTS "Everyone can update groups" ON email_sender_groups;
DROP POLICY IF EXISTS "Everyone can delete groups" ON email_sender_groups;

-- Step 5: Creare nuove policy isolate per utente
CREATE POLICY "Users can view own groups" 
ON email_sender_groups FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own groups" 
ON email_sender_groups FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own groups" 
ON email_sender_groups FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own groups" 
ON email_sender_groups FOR DELETE 
USING (user_id = auth.uid());

-- Step 6: Creare indice per performance
CREATE INDEX IF NOT EXISTS idx_email_sender_groups_user_id 
ON email_sender_groups(user_id);