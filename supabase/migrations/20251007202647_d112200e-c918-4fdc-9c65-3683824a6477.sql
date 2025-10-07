-- Fase 1: Tabelle per AI Prompt delle stanze

-- Tabella per il prompt AI globale standard
CREATE TABLE IF NOT EXISTS public.intranet_global_ai_prompt (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL DEFAULT 'Standard Translation & AI Prompt',
  prompt_contenuto TEXT NOT NULL,
  attivo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabella per i prompt AI specifici delle stanze
CREATE TABLE IF NOT EXISTS public.intranet_room_ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.intranet_rooms(id) ON DELETE CASCADE,
  custom_prompt TEXT,
  is_using_standard BOOLEAN NOT NULL DEFAULT true,
  enable_ai BOOLEAN NOT NULL DEFAULT true,
  enable_translation BOOLEAN NOT NULL DEFAULT true,
  enable_auto_speaker BOOLEAN NOT NULL DEFAULT false,
  enable_suggestions BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(room_id)
);

-- Enable RLS
ALTER TABLE public.intranet_global_ai_prompt ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intranet_room_ai_prompts ENABLE ROW LEVEL SECURITY;

-- RLS Policies per intranet_global_ai_prompt
-- Tutti possono leggere il prompt standard attivo
CREATE POLICY "Anyone can view active global AI prompt"
ON public.intranet_global_ai_prompt
FOR SELECT
TO authenticated
USING (attivo = true);

-- Solo admin globali possono modificare
CREATE POLICY "Only admins can manage global AI prompt"
ON public.intranet_global_ai_prompt
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies per intranet_room_ai_prompts
-- Solo creator e admin globali possono vedere e modificare
CREATE POLICY "Room creators and admins can view room AI settings"
ON public.intranet_room_ai_prompts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.intranet_rooms
    WHERE intranet_rooms.id = intranet_room_ai_prompts.room_id
    AND intranet_rooms.created_by = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Room creators and admins can manage room AI settings"
ON public.intranet_room_ai_prompts
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.intranet_rooms
    WHERE intranet_rooms.id = intranet_room_ai_prompts.room_id
    AND intranet_rooms.created_by = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.intranet_rooms
    WHERE intranet_rooms.id = intranet_room_ai_prompts.room_id
    AND intranet_rooms.created_by = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- Inserisci un prompt globale standard di default
INSERT INTO public.intranet_global_ai_prompt (nome, prompt_contenuto, attivo)
VALUES (
  'Standard Translation & AI Prompt',
  'Sei un assistente AI per la traduzione e comunicazione in tempo reale in una chat aziendale.

COMPITI PRINCIPALI:
1. Traduzione automatica: Traduci i messaggi tra diverse lingue mantenendo il tono e il contesto
2. Suggerimenti di risposta: Fornisci suggerimenti contestuali quando richiesto
3. Auto-speaker: Converti il testo in formato vocale quando abilitato

LINEE GUIDA:
- Mantieni sempre un tono professionale ma cordiale
- Rispetta le preferenze linguistiche di ogni utente
- Preserva formattazione, emoticon e contesto culturale
- Segnala quando una traduzione potrebbe avere multiple interpretazioni
- Non tradurre nomi propri, brand o termini tecnici specifici

PRIVACY E SICUREZZA:
- Non memorizzare contenuti sensibili
- Rispetta sempre le policy aziendali
- Mantieni la riservatezza delle conversazioni',
  true
)
ON CONFLICT DO NOTHING;

-- Trigger per aggiornare updated_at
CREATE OR REPLACE FUNCTION public.update_intranet_ai_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_intranet_global_ai_prompt_updated_at
  BEFORE UPDATE ON public.intranet_global_ai_prompt
  FOR EACH ROW
  EXECUTE FUNCTION public.update_intranet_ai_updated_at();

CREATE TRIGGER update_intranet_room_ai_prompts_updated_at
  BEFORE UPDATE ON public.intranet_room_ai_prompts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_intranet_ai_updated_at();