-- Tabella conversazioni Chat Laboratory
CREATE TABLE IF NOT EXISTS public.chat_laboratory_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titolo TEXT,
  active_participants JSONB DEFAULT '[]'::jsonb,
  memoria_completa BOOLEAN DEFAULT false,
  riassunto_contesto TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabella messaggi Chat Laboratory (multi-agente)
CREATE TABLE IF NOT EXISTS public.chat_laboratory_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_laboratory_conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('human', 'chatgpt', 'gemini', 'claude')),
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  is_visible_to_ai BOOLEAN DEFAULT true,
  attachments JSONB DEFAULT '[]'::jsonb,
  images JSONB DEFAULT '[]'::jsonb,
  generated_images JSONB DEFAULT '[]'::jsonb,
  token_input INTEGER,
  token_output INTEGER,
  tempo_risposta_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabella partecipanti attivi
CREATE TABLE IF NOT EXISTS public.chat_laboratory_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_laboratory_conversations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('human', 'chatgpt', 'gemini', 'claude')),
  name TEXT NOT NULL,
  system_prompt TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabella system prompts per Chat Laboratory
CREATE TABLE IF NOT EXISTS public.chat_laboratory_system_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  contenuto TEXT NOT NULL,
  attivo BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_chat_lab_messages_conversation ON public.chat_laboratory_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_lab_participants_conversation ON public.chat_laboratory_participants(conversation_id);

-- RLS Policies
ALTER TABLE public.chat_laboratory_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_laboratory_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_laboratory_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_laboratory_system_prompts ENABLE ROW LEVEL SECURITY;

-- Policy per conversations
CREATE POLICY "Allow all operations on chat_laboratory_conversations"
  ON public.chat_laboratory_conversations
  FOR ALL
  USING (true);

-- Policy per messages
CREATE POLICY "Allow all operations on chat_laboratory_messages"
  ON public.chat_laboratory_messages
  FOR ALL
  USING (true);

-- Policy per participants
CREATE POLICY "Allow all operations on chat_laboratory_participants"
  ON public.chat_laboratory_participants
  FOR ALL
  USING (true);

-- Policy per system prompts
CREATE POLICY "Allow all operations on chat_laboratory_system_prompts"
  ON public.chat_laboratory_system_prompts
  FOR ALL
  USING (true);

-- Trigger per updated_at
CREATE OR REPLACE FUNCTION update_chat_laboratory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chat_laboratory_conversations_updated_at
  BEFORE UPDATE ON public.chat_laboratory_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_laboratory_updated_at();

CREATE TRIGGER update_chat_laboratory_participants_updated_at
  BEFORE UPDATE ON public.chat_laboratory_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_laboratory_updated_at();