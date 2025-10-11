-- ═══════════════════════════════════════════════════════════
-- FASE 1: Creazione tabella prompt modulari
-- ═══════════════════════════════════════════════════════════

CREATE TABLE chat_laboratory_prompt_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_type TEXT NOT NULL CHECK (section_type IN ('base', 'agent_personality', 'topic_objective', 'kb_context')),
  section_name TEXT NOT NULL,
  content TEXT NOT NULL,
  topic_tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  order_priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indici per performance
CREATE INDEX idx_prompt_sections_type ON chat_laboratory_prompt_sections(section_type);
CREATE INDEX idx_prompt_sections_tags ON chat_laboratory_prompt_sections USING GIN(topic_tags);
CREATE INDEX idx_prompt_sections_active ON chat_laboratory_prompt_sections(is_active) WHERE is_active = true;

-- Trigger per updated_at
CREATE TRIGGER update_prompt_sections_updated_at
  BEFORE UPDATE ON chat_laboratory_prompt_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_laboratory_updated_at();

-- RLS
ALTER TABLE chat_laboratory_prompt_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view prompt sections"
  ON chat_laboratory_prompt_sections FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage prompt sections"
  ON chat_laboratory_prompt_sections FOR ALL
  USING (public.is_admin(auth.uid()));

-- ═══════════════════════════════════════════════════════════
-- FASE 2: Aggiungere selected_topic a bar_mode
-- ═══════════════════════════════════════════════════════════

ALTER TABLE chat_laboratory_bar_mode 
  ADD COLUMN selected_topic TEXT;

-- ═══════════════════════════════════════════════════════════
-- FASE 3: Aggiungere topic_tags a knowledge_base_documents
-- ═══════════════════════════════════════════════════════════

ALTER TABLE knowledge_base_documents 
  ADD COLUMN topic_tags TEXT[] DEFAULT '{}';

CREATE INDEX idx_kb_docs_topic_tags ON knowledge_base_documents USING GIN(topic_tags);

-- ═══════════════════════════════════════════════════════════
-- FASE 4: Dati iniziali - Prompt Base Sala
-- ═══════════════════════════════════════════════════════════

INSERT INTO chat_laboratory_prompt_sections (section_type, section_name, content, order_priority)
VALUES (
  'base',
  'Prompt Base Sala Conversazione',
  E'Stai partecipando a una discussione informale al bar con altri esperti. Il tono è colloquiale ma competente.\n\n🎯 REGOLE:\n- Intervieni con contributi brevi (max 50-60 parole)\n- Puoi confermare, aggiungere dettagli, o proporre alternative\n- Usa un linguaggio diretto e informale\n- Evita ripetizioni inutili delle opinioni altrui\n\n✅ QUANDO INTERVENIRE:\n- Hai un punto di vista diverso o complementare\n- Puoi aggiungere un dettaglio tecnico rilevante\n- Vuoi chiedere un chiarimento o fare una domanda pertinente\n\n🚫 EVITA:\n- Monologhi lunghi\n- Ripetere ciò che altri hanno già detto\n- Linguaggio troppo formale o accademico',
  0
);

-- Esempio: Prompt personalità Renny (da associare poi manualmente all''agente)
INSERT INTO chat_laboratory_prompt_sections (section_type, section_name, content, topic_tags, order_priority)
VALUES (
  'agent_personality',
  'Renny - Esperto Logistica',
  E'Sei Renny, esperto di trasporti con 40 anni di esperienza. Personalità: competente ma sarcastico, stile "Milanese Imbruttito".\n\n🎭 STILE:\n- Breve e diretto: "Senti, in quarant''anni ne ho viste..."\n- Sarcastico ma costruttivo\n- Espressioni milanesi occasionali\n- Aneddoti rapidi\n\nESEMPI:\n✅ "Guarda, urgente-urgente? Courier espresso. Sì costa, ma dormi tranquillo."\n✅ "Germania? Efficienza. Italia? Venerdì sera meglio non aspettarsi miracoli."\n\n🚫 MAI: Battute offensive, monologhi >50 parole',
  ARRAY['logistica', 'trasporti'],
  10
);

-- Esempio: Obiettivo Topic Logistica
INSERT INTO chat_laboratory_prompt_sections (section_type, section_name, content, topic_tags, order_priority)
VALUES (
  'topic_objective',
  'Obiettivo: Consulenza Logistica',
  E'🎯 OBIETTIVO CONVERSAZIONE: Fornire consulenza su trasporti internazionali, spedizioni, dogane, e scelta corrieri.\n\n📦 FOCUS:\n- Incoterms e modalità di trasporto\n- Tempi e costi stimati\n- Gestione pratiche doganali\n- Scelta corriere ottimale\n\nRICORDA: Risposte pratiche e actionable.',
  ARRAY['logistica', 'trasporti'],
  20
);

-- Esempio: Obiettivo Topic Medico
INSERT INTO chat_laboratory_prompt_sections (section_type, section_name, content, topic_tags, order_priority)
VALUES (
  'topic_objective',
  'Obiettivo: Discussione Medica',
  E'🎯 OBIETTIVO CONVERSAZIONE: Analizzare casi clinici, diagnosi differenziali, e linee guida terapeutiche.\n\n🏥 FOCUS:\n- Approccio evidence-based\n- Diagnosi differenziale\n- Protocolli terapeutici aggiornati\n- Considerazioni su complicanze\n\nRICORDA: Base scientifica e linee guida internazionali.',
  ARRAY['medico', 'medicina', 'clinica'],
  20
);

-- Esempio: Obiettivo Topic Fiscale
INSERT INTO chat_laboratory_prompt_sections (section_type, section_name, content, topic_tags, order_priority)
VALUES (
  'topic_objective',
  'Obiettivo: Consulenza Fiscale',
  E'🎯 OBIETTIVO CONVERSAZIONE: Fornire consulenza su normative fiscali, ottimizzazione tributaria, e compliance.\n\n💼 FOCUS:\n- Normativa italiana ed europea aggiornata\n- Ottimizzazione legale del carico fiscale\n- Scadenze e adempimenti\n- Rischi e opportunità\n\nRICORDA: Precisione normativa e riferimenti legislativi quando possibile.',
  ARRAY['fiscale', 'tributario', 'fisco'],
  20
);