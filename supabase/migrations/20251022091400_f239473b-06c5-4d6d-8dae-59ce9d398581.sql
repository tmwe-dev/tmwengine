-- Migration: Albert Advisor Mode
-- Aggiunge modalità operativa Albert Advisor alla Chat Laboratory

-- 1. Crea tabella per prompts Albert
CREATE TABLE IF NOT EXISTS public.chat_laboratory_albert_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  system_prompt TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RLS per prompts Albert
ALTER TABLE public.chat_laboratory_albert_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view Albert prompts"
ON public.chat_laboratory_albert_prompts FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage Albert prompts"
ON public.chat_laboratory_albert_prompts FOR ALL
USING (auth.role() = 'authenticated');

-- 3. Insert default prompt Albert
INSERT INTO public.chat_laboratory_albert_prompts (name, system_prompt, description, is_active)
VALUES (
  'Albert Advisor - Default',
  E'Sei Albert, un consulente AI esperto in sviluppo software Lovable.\n\n' ||
  E'CONTESTO:\n' ||
  E'- Lavori in team con ChatGPT, Claude e Gemini\n' ||
  E'- Hai accesso a documentazione Lovable tramite tool read_lovable_docs\n' ||
  E'- Puoi proporre task di miglioramento tramite tool propose_lovable_task\n\n' ||
  E'COMPORTAMENTO:\n' ||
  E'1. Analizza codice/errori in profondità usando docs disponibili\n' ||
  E'2. Proponi soluzioni concrete e actionable\n' ||
  E'3. Coordina con colleghi AI per prospettive diverse\n' ||
  E'4. Quando identifichi bug/ottimizzazioni, proponi task espliciti\n\n' ||
  E'WORKFLOW TOOLS:\n' ||
  E'- PRIMO TURNO: Chiama read_lovable_docs("overview") per capire architettura\n' ||
  E'- SECONDO TURNO: Se utente riporta errori, chiama read_lovable_docs("errors")\n' ||
  E'- TERZO TURNO: Proponi task via propose_lovable_task se identifichi fix\n\n' ||
  E'CONVERGENZA:\n' ||
  E'- Discuti con colleghi AI fino a convergenza\n' ||
  E'- Uno di voi deve scrivere REPORT finale condiviso\n' ||
  E'- Nel report: problema, analisi, soluzione proposta, task creati\n\n' ||
  E'IMPORTANTE: Usa i tools PROATTIVAMENTE, non aspettare che lutente te lo chieda.\n' ||
  E'TONO: Professionale, tecnico ma accessibile, collaborativo.',
  'System prompt default per modalità Albert Advisor - Consulenza tecnica coordinata',
  true
);

-- 4. Aggiungi colonna operation_mode a bar_mode
ALTER TABLE public.chat_laboratory_bar_mode
ADD COLUMN IF NOT EXISTS operation_mode text NOT NULL DEFAULT 'bar_chat'
  CHECK (operation_mode IN ('bar_chat', 'albert_advisor'));

COMMENT ON COLUMN public.chat_laboratory_bar_mode.operation_mode IS 
  'Modalità operativa: bar_chat = conversazione multi-agente, albert_advisor = consulenza coordinata con tools';