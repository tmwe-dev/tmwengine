-- =====================================================
-- CHAT SYSTEM - DATABASE SCHEMA BACKUP
-- Data: 2025-10-12
-- Tabelle: 12 (4 Chat Normale + 8 Chat Laboratory)
-- =====================================================

-- =====================================================
-- CHAT NORMALE (4 tabelle)
-- =====================================================

-- 1. chat_conversations
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  system_prompt_id UUID REFERENCES public.chat_system_prompts(id),
  memoria_completa BOOLEAN DEFAULT false,
  usa_riassunto BOOLEAN DEFAULT false,
  riassunto_contesto TEXT,
  titolo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. chat_messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  model TEXT,
  token_input INTEGER,
  token_output INTEGER,
  tokens_used INTEGER,
  tempo_risposta_ms INTEGER,
  attachments JSONB DEFAULT '[]'::jsonb,
  images JSONB DEFAULT '[]'::jsonb,
  generated_images JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_conversation ON public.chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at);

-- 3. chat_system_prompts
CREATE TABLE IF NOT EXISTS public.chat_system_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  contenuto TEXT NOT NULL,
  attivo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. chat_usage_stats
CREATE TABLE IF NOT EXISTS public.chat_usage_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  data_utilizzo DATE NOT NULL DEFAULT CURRENT_DATE,
  numero_messaggi INTEGER NOT NULL DEFAULT 0,
  token_totali_input INTEGER NOT NULL DEFAULT 0,
  token_totali_output INTEGER NOT NULL DEFAULT 0,
  tempo_totale_ms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, data_utilizzo)
);

-- =====================================================
-- CHAT LABORATORY (8 tabelle)
-- =====================================================

-- 5. chat_laboratory_conversations
CREATE TABLE IF NOT EXISTS public.chat_laboratory_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  system_prompt_id UUID REFERENCES public.chat_laboratory_system_prompts(id),
  titolo TEXT,
  memoria_completa BOOLEAN DEFAULT false,
  riassunto_contesto TEXT,
  active_participants JSONB DEFAULT '[]'::jsonb,
  last_speaker_index INTEGER DEFAULT 0,
  current_turn_index INTEGER DEFAULT 0,
  conversation_phase TEXT DEFAULT 'discussion'::text CHECK (conversation_phase IN ('discussion', 'convergence', 'concluded')),
  response_mode TEXT DEFAULT 'all'::text CHECK (response_mode IN ('all', 'single', 'target')),
  target_participant_type TEXT,
  final_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. chat_laboratory_messages
CREATE TABLE IF NOT EXISTS public.chat_laboratory_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_laboratory_conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('human', 'chatgpt', 'gemini', 'claude', 'system')),
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  is_visible_to_ai BOOLEAN DEFAULT true,
  token_input INTEGER,
  token_output INTEGER,
  tempo_risposta_ms INTEGER,
  attachments JSONB DEFAULT '[]'::jsonb,
  images JSONB DEFAULT '[]'::jsonb,
  generated_images JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_lab_messages_conversation ON public.chat_laboratory_messages(conversation_id);
CREATE INDEX idx_lab_messages_created_at ON public.chat_laboratory_messages(created_at);
CREATE INDEX idx_lab_messages_sender ON public.chat_laboratory_messages(sender_type);

-- 7. chat_laboratory_participants
CREATE TABLE IF NOT EXISTS public.chat_laboratory_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_laboratory_conversations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('chatgpt', 'gemini', 'claude')),
  name TEXT NOT NULL,
  role_name TEXT DEFAULT 'Partecipante'::text,
  role_description TEXT,
  system_prompt TEXT,
  is_active BOOLEAN DEFAULT true,
  response_count INTEGER DEFAULT 0,
  has_responded_current_turn BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_lab_participants_conversation ON public.chat_laboratory_participants(conversation_id);
CREATE INDEX idx_lab_participants_type ON public.chat_laboratory_participants(type);

-- 8. chat_laboratory_system_prompts
CREATE TABLE IF NOT EXISTS public.chat_laboratory_system_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  contenuto TEXT NOT NULL,
  attivo BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 9. chat_laboratory_usage_stats
CREATE TABLE IF NOT EXISTS public.chat_laboratory_usage_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_laboratory_conversations(id) ON DELETE CASCADE,
  data_utilizzo DATE NOT NULL DEFAULT CURRENT_DATE,
  numero_messaggi INTEGER NOT NULL DEFAULT 0,
  token_totali_input INTEGER NOT NULL DEFAULT 0,
  token_totali_output INTEGER NOT NULL DEFAULT 0,
  tempo_totale_ms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, data_utilizzo)
);

-- 10. chat_laboratory_bar_mode
CREATE TABLE IF NOT EXISTS public.chat_laboratory_bar_mode (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL UNIQUE REFERENCES public.chat_laboratory_conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  mode TEXT NOT NULL DEFAULT 'laboratory'::text CHECK (mode IN ('laboratory', 'bar')),
  selected_topic TEXT,
  active_kb_id UUID REFERENCES public.knowledge_bases(id),
  active_elevenlabs_agents UUID[] DEFAULT '{}'::uuid[],
  kb_navigation_history JSONB DEFAULT '[]'::jsonb,
  voice_enabled BOOLEAN NOT NULL DEFAULT false,
  auto_play_audio BOOLEAN NOT NULL DEFAULT true,
  enable_interruptions BOOLEAN NOT NULL DEFAULT true,
  conversation_pace TEXT NOT NULL DEFAULT 'normal'::text CHECK (conversation_pace IN ('slow', 'normal', 'fast')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_bar_mode_conversation ON public.chat_laboratory_bar_mode(conversation_id);
CREATE INDEX idx_bar_mode_user ON public.chat_laboratory_bar_mode(user_id);

-- 11. chat_laboratory_audio_responses
CREATE TABLE IF NOT EXISTS public.chat_laboratory_audio_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.chat_laboratory_messages(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.elevenlabs_agents(id),
  audio_url TEXT NOT NULL,
  duration_seconds DOUBLE PRECISION,
  text_length INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_audio_responses_message ON public.chat_laboratory_audio_responses(message_id);

-- 12. chat_laboratory_prompt_sections
CREATE TABLE IF NOT EXISTS public.chat_laboratory_prompt_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_name TEXT NOT NULL,
  section_type TEXT NOT NULL CHECK (section_type IN ('base', 'agent_personality', 'topic_objective', 'kb_context')),
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  order_priority INTEGER DEFAULT 0,
  topic_tags TEXT[] DEFAULT '{}'::text[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_prompt_sections_type ON public.chat_laboratory_prompt_sections(section_type);
CREATE INDEX idx_prompt_sections_active ON public.chat_laboratory_prompt_sections(is_active);
CREATE INDEX idx_prompt_sections_tags ON public.chat_laboratory_prompt_sections USING GIN(topic_tags);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger per auto-update updated_at (chat normale)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_chat_conversations_updated_at
  BEFORE UPDATE ON public.chat_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chat_system_prompts_updated_at
  BEFORE UPDATE ON public.chat_system_prompts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger per auto-update updated_at (chat laboratory)
CREATE OR REPLACE FUNCTION public.update_chat_laboratory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chat_laboratory_conversations_updated_at
  BEFORE UPDATE ON public.chat_laboratory_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_chat_laboratory_updated_at();

CREATE TRIGGER update_chat_laboratory_participants_updated_at
  BEFORE UPDATE ON public.chat_laboratory_participants
  FOR EACH ROW EXECUTE FUNCTION public.update_chat_laboratory_updated_at();

CREATE TRIGGER update_chat_laboratory_system_prompts_updated_at
  BEFORE UPDATE ON public.chat_laboratory_system_prompts
  FOR EACH ROW EXECUTE FUNCTION public.update_chat_laboratory_updated_at();

CREATE TRIGGER update_chat_laboratory_bar_mode_updated_at
  BEFORE UPDATE ON public.chat_laboratory_bar_mode
  FOR EACH ROW EXECUTE FUNCTION public.update_chat_laboratory_updated_at();

CREATE TRIGGER update_chat_laboratory_prompt_sections_updated_at
  BEFORE UPDATE ON public.chat_laboratory_prompt_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_chat_laboratory_updated_at();

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Chat Normale - Policies permissive (adjust as needed)
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_system_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_usage_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on chat_conversations" 
  ON public.chat_conversations FOR ALL USING (true);

CREATE POLICY "Allow all operations on chat_messages" 
  ON public.chat_messages FOR ALL USING (true);

CREATE POLICY "Allow all operations on chat_system_prompts" 
  ON public.chat_system_prompts FOR ALL USING (true);

CREATE POLICY "Allow all operations on chat_usage_stats" 
  ON public.chat_usage_stats FOR ALL USING (true);

-- Chat Laboratory - Policies permissive (adjust as needed)
ALTER TABLE public.chat_laboratory_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_laboratory_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_laboratory_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_laboratory_system_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_laboratory_usage_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_laboratory_bar_mode ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_laboratory_audio_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_laboratory_prompt_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on chat_laboratory_conversations" 
  ON public.chat_laboratory_conversations FOR ALL USING (true);

CREATE POLICY "Allow all operations on chat_laboratory_messages" 
  ON public.chat_laboratory_messages FOR ALL USING (true);

CREATE POLICY "Allow all operations on chat_laboratory_participants" 
  ON public.chat_laboratory_participants FOR ALL USING (true);

CREATE POLICY "Allow all operations on chat_laboratory_system_prompts" 
  ON public.chat_laboratory_system_prompts FOR ALL USING (true);

CREATE POLICY "Allow all operations on chat_laboratory_usage_stats" 
  ON public.chat_laboratory_usage_stats FOR ALL USING (true);

-- Bar Mode policies
CREATE POLICY "Users can manage their own bar mode settings" 
  ON public.chat_laboratory_bar_mode FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own bar mode settings" 
  ON public.chat_laboratory_bar_mode FOR SELECT USING (auth.uid() = user_id);

-- Audio responses policies
CREATE POLICY "System can insert audio responses" 
  ON public.chat_laboratory_audio_responses FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view audio responses for their conversations" 
  ON public.chat_laboratory_audio_responses FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM chat_laboratory_messages m
    JOIN chat_laboratory_bar_mode bm ON m.conversation_id = bm.conversation_id
    WHERE m.id = chat_laboratory_audio_responses.message_id
    AND bm.user_id = auth.uid()
  ));

-- Prompt sections policies
CREATE POLICY "Admins can manage prompt sections" 
  ON public.chat_laboratory_prompt_sections FOR ALL 
  USING (is_admin(auth.uid()));

CREATE POLICY "Anyone can view prompt sections" 
  ON public.chat_laboratory_prompt_sections FOR SELECT USING (true);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;

-- =====================================================
-- END SCHEMA
-- =====================================================
