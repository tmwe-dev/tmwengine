-- Tabella per le configurazioni di stile UI
CREATE TABLE public.ui_style_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  tipo TEXT NOT NULL, -- 'gradient', 'color', 'shadow', etc.
  contesto TEXT NOT NULL, -- dove viene usato: 'chat_conversation', 'chat_message_user', etc.
  configurazione JSONB NOT NULL, -- parametri dello stile
  descrizione TEXT,
  attivo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index per ricerca veloce
CREATE INDEX idx_ui_style_configs_contesto ON public.ui_style_configs(contesto);
CREATE INDEX idx_ui_style_configs_attivo ON public.ui_style_configs(attivo);

-- Trigger per updated_at
CREATE TRIGGER update_ui_style_configs_updated_at
  BEFORE UPDATE ON public.ui_style_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS policies
ALTER TABLE public.ui_style_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on ui_style_configs"
  ON public.ui_style_configs
  FOR ALL
  USING (true);

-- Inserimento delle due configurazioni gradient
INSERT INTO public.ui_style_configs (nome, tipo, contesto, configurazione, descrizione) VALUES
(
  'Purple Fade Gradient',
  'gradient',
  'chat_conversation_active',
  '{
    "direction": "to-l",
    "from": { "color": "purple-500", "opacity": 10 },
    "via": { "color": "purple-500", "opacity": 5, "position": 35 },
    "to": "transparent",
    "border": { "color": "purple-500", "opacity": 20 }
  }'::jsonb,
  'Gradiente viola per conversazione attiva - sfumatura da destra a sinistra con viola al 10% che sfuma al 5% al 35% della larghezza'
),
(
  'Purple Fade Gradient Hover',
  'gradient',
  'chat_conversation_hover',
  '{
    "direction": "to-l",
    "from": { "color": "purple-500", "opacity": 10 },
    "via": { "color": "purple-500", "opacity": 5, "position": 35 },
    "to": "transparent",
    "border": { "color": "purple-500", "opacity": 30 }
  }'::jsonb,
  'Gradiente viola per conversazione al hover - stesso del active ma con bordo al 30%'
),
(
  'Purple Message Gradient',
  'gradient',
  'chat_message_user',
  '{
    "direction": "to-l",
    "from": { "color": "purple-500", "opacity": 10 },
    "via": { "color": "purple-500", "opacity": 5, "position": 35 },
    "to": "transparent",
    "border": { "color": "purple-500", "opacity": 20 }
  }'::jsonb,
  'Gradiente viola per messaggi utente - sfumatura da destra a sinistra'
),
(
  'Orange Message Gradient',
  'gradient',
  'chat_message_assistant',
  '{
    "direction": "to-l",
    "from": { "color": "orange-500", "opacity": 10 },
    "via": { "color": "orange-500", "opacity": 5, "position": 35 },
    "to": "transparent",
    "border": { "color": "orange-500", "opacity": 20 }
  }'::jsonb,
  'Gradiente arancione per messaggi assistente AI - sfumatura da destra a sinistra'
);