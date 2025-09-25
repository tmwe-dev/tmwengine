-- Tabella per i system prompts
CREATE TABLE public.chat_system_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  contenuto TEXT NOT NULL,
  attivo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabella per le conversazioni
CREATE TABLE public.chat_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titolo TEXT,
  system_prompt_id UUID REFERENCES public.chat_system_prompts(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabella per i messaggi
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  model TEXT,
  tokens_used INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.chat_system_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies per permettere tutte le operazioni (dato che non c'è autenticazione)
CREATE POLICY "Allow all operations on chat_system_prompts" 
ON public.chat_system_prompts 
FOR ALL 
USING (true);

CREATE POLICY "Allow all operations on chat_conversations" 
ON public.chat_conversations 
FOR ALL 
USING (true);

CREATE POLICY "Allow all operations on chat_messages" 
ON public.chat_messages 
FOR ALL 
USING (true);

-- Trigger per aggiornare updated_at
CREATE TRIGGER update_chat_system_prompts_updated_at
  BEFORE UPDATE ON public.chat_system_prompts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chat_conversations_updated_at
  BEFORE UPDATE ON public.chat_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes per performance
CREATE INDEX idx_chat_messages_conversation_id ON public.chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at);
CREATE INDEX idx_chat_conversations_created_at ON public.chat_conversations(created_at);

-- Abilitare realtime per tutte le tabelle
ALTER TABLE public.chat_system_prompts REPLICA IDENTITY FULL;
ALTER TABLE public.chat_conversations REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_system_prompts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Inserire un system prompt di default
INSERT INTO public.chat_system_prompts (nome, contenuto, attivo) 
VALUES ('Default', 'Sei un assistente AI utile e amichevole che risponde in italiano.', true);