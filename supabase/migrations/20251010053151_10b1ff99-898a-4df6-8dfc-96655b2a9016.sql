-- FASE 1: Isolamento Multi-Utente per Email Platform
-- Gruppi condivisi, Regole e Azioni personali

-- 1.1 Aggiungere user_id SOLO a regole e azioni (gruppi restano condivisi)
ALTER TABLE email_sender_rules
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE email_sender_actions
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 1.2 Aggiungere indici per performance
CREATE INDEX idx_email_sender_rules_user_id ON email_sender_rules(user_id);
CREATE INDEX idx_email_sender_actions_user_id ON email_sender_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_user_email ON email_messages(user_email);

-- 1.3 Pulire email_messages senza user_email e rendere NOT NULL
DELETE FROM email_messages WHERE user_email IS NULL OR user_email = '';

ALTER TABLE email_messages 
ALTER COLUMN user_email SET NOT NULL;

-- 1.4 RLS per email_sender_groups (CONDIVISI - tutti possono vedere/creare)
ALTER TABLE email_sender_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on email_sender_groups" ON email_sender_groups;

CREATE POLICY "Everyone can view groups"
ON email_sender_groups FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Everyone can create groups"
ON email_sender_groups FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Everyone can update groups"
ON email_sender_groups FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Everyone can delete groups"
ON email_sender_groups FOR DELETE
TO authenticated
USING (true);

-- 1.5 RLS per email_sender_rules (PERSONALI)
ALTER TABLE email_sender_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on email_sender_rules" ON email_sender_rules;

CREATE POLICY "Users can view own rules"
ON email_sender_rules FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create own rules"
ON email_sender_rules FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own rules"
ON email_sender_rules FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own rules"
ON email_sender_rules FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- 1.6 RLS per email_sender_actions (PERSONALI)
ALTER TABLE email_sender_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on email_sender_actions" ON email_sender_actions;

CREATE POLICY "Users can view own actions"
ON email_sender_actions FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create own actions"
ON email_sender_actions FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own actions"
ON email_sender_actions FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own actions"
ON email_sender_actions FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- 1.7 RLS per email_messages (PERSONALI per user_email)
DROP POLICY IF EXISTS "Allow all operations on email_messages" ON email_messages;

CREATE POLICY "Users can view own emails"
ON email_messages FOR SELECT
TO authenticated
USING (user_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can insert own emails"
ON email_messages FOR INSERT
TO authenticated
WITH CHECK (user_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can update own emails"
ON email_messages FOR UPDATE
TO authenticated
USING (user_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can delete own emails"
ON email_messages FOR DELETE
TO authenticated
USING (user_email = (SELECT email FROM auth.users WHERE id = auth.uid()));