-- 🧠 MEMORIA CONTESTUALE: Topics Database
DROP TABLE IF EXISTS public.email_topics CASCADE;
CREATE TABLE public.email_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  topic_key TEXT NOT NULL,
  topic_type TEXT NOT NULL,
  topic_value TEXT NOT NULL,
  related_emails TEXT[] DEFAULT '{}',
  first_mention_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_mention_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  mention_count INTEGER DEFAULT 1,
  context_summary TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_email_topics_user_type ON public.email_topics(user_id, topic_type);
CREATE INDEX idx_email_topics_key ON public.email_topics(topic_key);
CREATE INDEX idx_email_topics_value ON public.email_topics(topic_value);

ALTER TABLE public.email_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own topics"
ON public.email_topics FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own topics"
ON public.email_topics FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own topics"
ON public.email_topics FOR UPDATE
USING (auth.uid() = user_id);

-- 💬 CONVERSAZIONI RECENTI
DROP TABLE IF EXISTS public.email_conversation_history CASCADE;
CREATE TABLE public.email_conversation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  sender_email TEXT NOT NULL,
  conversation_summary TEXT,
  last_emails JSONB DEFAULT '[]',
  total_exchanges INTEGER DEFAULT 0,
  last_email_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  relationship_status TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_conversation_history_user_sender ON public.email_conversation_history(user_id, sender_email);
CREATE INDEX idx_conversation_history_last_email ON public.email_conversation_history(last_email_at DESC);

ALTER TABLE public.email_conversation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversation history"
ON public.email_conversation_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversation history"
ON public.email_conversation_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversation history"
ON public.email_conversation_history FOR UPDATE
USING (auth.uid() = user_id);

-- 🎭 PERSONALITÀ UTENTE
DROP TABLE IF EXISTS public.user_personality_profile CASCADE;
CREATE TABLE public.user_personality_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  tone_preference TEXT DEFAULT 'professional',
  formality_level INTEGER DEFAULT 3,
  response_style TEXT DEFAULT 'balanced',
  language_preferences JSONB DEFAULT '{"primary": "it", "fallback": "en"}',
  signature_template TEXT,
  common_phrases TEXT[] DEFAULT '{}',
  decision_patterns JSONB DEFAULT '{}',
  priority_keywords TEXT[] DEFAULT '{}',
  learned_behaviors JSONB DEFAULT '{}',
  last_learning_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.user_personality_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own personality profile"
ON public.user_personality_profile FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own personality profile"
ON public.user_personality_profile FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own personality profile"
ON public.user_personality_profile FOR UPDATE
USING (auth.uid() = user_id);

-- 🔍 LOG RICERCHE CONTESTUALI
DROP TABLE IF EXISTS public.email_contextual_searches CASCADE;
CREATE TABLE public.email_contextual_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email_id TEXT NOT NULL,
  search_type TEXT NOT NULL,
  search_query TEXT NOT NULL,
  search_result JSONB,
  was_successful BOOLEAN DEFAULT false,
  execution_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_contextual_searches_user_email ON public.email_contextual_searches(user_id, email_id);

ALTER TABLE public.email_contextual_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contextual searches"
ON public.email_contextual_searches FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contextual searches"
ON public.email_contextual_searches FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Trigger per aggiornare updated_at
CREATE TRIGGER update_email_topics_updated_at
  BEFORE UPDATE ON public.email_topics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conversation_history_updated_at
  BEFORE UPDATE ON public.email_conversation_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_personality_profile_updated_at
  BEFORE UPDATE ON public.user_personality_profile
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();