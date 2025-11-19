-- INCREMENTO 2-3-5: Knowledge Base + Pending Actions Tables
-- Tabelle per memoria conversazioni, topics, e azioni AI da approvare

-- 1. EMAIL TOPICS (argomenti/reference numbers estratti dalle email)
CREATE TABLE email_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_name TEXT NOT NULL,
  topic_type TEXT NOT NULL CHECK (topic_type IN ('tracking', 'invoice', 'order', 'meeting', 'generic')),
  reference_number TEXT,
  first_mentioned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_mentioned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  email_count INTEGER DEFAULT 1,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. EMAIL-TOPICS LINKING (many-to-many)
CREATE TABLE email_messages_topics (
  email_id UUID NOT NULL REFERENCES email_messages(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES email_topics(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (email_id, topic_id)
);

-- 3. CONVERSATION HISTORY (memoria ultimi 5 scambi per sender)
CREATE TABLE conversation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_email TEXT NOT NULL,
  conversation_summary TEXT,
  last_5_exchanges JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, sender_email)
);

-- 4. PENDING ACTIONS (azioni AI da approvare/rifiutare)
CREATE TABLE email_pending_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_id UUID NOT NULL REFERENCES email_messages(id) ON DELETE CASCADE,
  sender_email TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('reply', 'forward', 'archive', 'delete', 'create_task', 'nothing')),
  action_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  suggested_response TEXT,
  reasoning TEXT NOT NULL,
  confidence NUMERIC(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'executed')),
  user_modifications JSONB,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  executed_at TIMESTAMPTZ
);

-- INDICES
CREATE INDEX idx_email_topics_user_type ON email_topics(user_id, topic_type);
CREATE INDEX idx_email_topics_reference ON email_topics(reference_number) WHERE reference_number IS NOT NULL;
CREATE INDEX idx_conversation_history_sender ON conversation_history(user_id, sender_email);
CREATE INDEX idx_pending_actions_status ON email_pending_actions(user_id, status);
CREATE INDEX idx_pending_actions_email ON email_pending_actions(email_id);

-- RLS POLICIES
ALTER TABLE email_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_messages_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_pending_actions ENABLE ROW LEVEL SECURITY;

-- email_topics policies
CREATE POLICY "Users can view own topics"
ON email_topics FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own topics"
ON email_topics FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own topics"
ON email_topics FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own topics"
ON email_topics FOR DELETE
USING (auth.uid() = user_id);

-- email_messages_topics policies
CREATE POLICY "Users can view own email-topic links"
ON email_messages_topics FOR SELECT
USING (EXISTS (
  SELECT 1 FROM email_messages em
  WHERE em.id = email_messages_topics.email_id
  AND em.user_email = auth.jwt() ->> 'email'
));

CREATE POLICY "Users can insert own email-topic links"
ON email_messages_topics FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM email_messages em
  WHERE em.id = email_messages_topics.email_id
  AND em.user_email = auth.jwt() ->> 'email'
));

CREATE POLICY "Users can delete own email-topic links"
ON email_messages_topics FOR DELETE
USING (EXISTS (
  SELECT 1 FROM email_messages em
  WHERE em.id = email_messages_topics.email_id
  AND em.user_email = auth.jwt() ->> 'email'
));

-- conversation_history policies
CREATE POLICY "Users can view own conversation history"
ON conversation_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversation history"
ON conversation_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversation history"
ON conversation_history FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversation history"
ON conversation_history FOR DELETE
USING (auth.uid() = user_id);

-- email_pending_actions policies
CREATE POLICY "Users can view own pending actions"
ON email_pending_actions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pending actions"
ON email_pending_actions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending actions"
ON email_pending_actions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pending actions"
ON email_pending_actions FOR DELETE
USING (auth.uid() = user_id);

-- TRIGGERS per updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_email_topics_updated_at
BEFORE UPDATE ON email_topics
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversation_history_updated_at
BEFORE UPDATE ON conversation_history
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pending_actions_updated_at
BEFORE UPDATE ON email_pending_actions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- COMMENTS
COMMENT ON TABLE email_topics IS 'Topics/reference numbers estratti dalle email (tracking AWB, ordini, fatture, meeting)';
COMMENT ON TABLE email_messages_topics IS 'Linking many-to-many tra email e topics';
COMMENT ON TABLE conversation_history IS 'Memoria conversazioni: ultimi 5 scambi per ogni sender';
COMMENT ON TABLE email_pending_actions IS 'Azioni proposte da AI in attesa di approvazione utente';
COMMENT ON COLUMN email_pending_actions.confidence IS 'Score 0.00-1.00: >0.80 = auto-execute se gruppo certified';
COMMENT ON COLUMN conversation_history.last_5_exchanges IS 'Array di oggetti: [{date, subject, summary}]';