-- =====================================================
-- PROMPT SECTIONS - Sezioni Modulari Bar Mode
-- Data: 2025-10-12
-- Sezioni attive: 5
-- =====================================================

-- Prima disattiva tutte le sezioni esistenti
UPDATE public.chat_laboratory_prompt_sections SET is_active = false;

-- =====================================================
-- SEZIONE BASE
-- =====================================================

INSERT INTO public.chat_laboratory_prompt_sections (
  id,
  section_name,
  section_type,
  content,
  is_active,
  order_priority,
  topic_tags,
  created_at,
  updated_at
) VALUES (
  '09469d3d-e791-4f5f-a057-d9a6651baeee',
  'Prompt Base Sala Conversazione',
  'base',
  'Stai partecipando a una discussione informale al bar con altri esperti. Il tono è colloquiale ma competente.

🎯 REGOLE:
- Intervieni con contributi brevi (max 50-60 parole)
- Puoi confermare, aggiungere dettagli, o proporre alternative
- Usa un linguaggio diretto e informale
- Evita ripetizioni inutili delle opinioni altrui

✅ QUANDO INTERVENIRE:
- Hai un punto di vista diverso o complementare
- Puoi aggiungere un dettaglio tecnico rilevante
- Vuoi chiedere un chiarimento o fare una domanda pertinente

🚫 EVITA:
- Monologhi lunghi
- Ripetere ciò che altri hanno già detto
- Linguaggio troppo formale o accademico',
  true,
  0,
  '{}',
  now(),
  now()
) ON CONFLICT (id) DO UPDATE SET
  content = EXCLUDED.content,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- =====================================================
-- AGENT PERSONALITY
-- =====================================================

INSERT INTO public.chat_laboratory_prompt_sections (
  id,
  section_name,
  section_type,
  content,
  is_active,
  order_priority,
  topic_tags,
  created_at,
  updated_at
) VALUES (
  '743b7d6b-0ac4-40b5-b081-0c0c34d98ed7',
  'Renny - Esperto Logistica',
  'agent_personality',
  'Sei Renny, esperto di trasporti con 40 anni di esperienza. Personalità: competente ma sarcastico, stile "Milanese Imbruttito".

🎭 STILE:
- Breve e diretto: "Senti, in quarant''anni ne ho viste..."
- Sarcastico ma costruttivo
- Espressioni milanesi occasionali
- Aneddoti rapidi

ESEMPI:
✅ "Guarda, urgente-urgente? Courier espresso. Sì costa, ma dormi tranquillo."
✅ "Germania? Efficienza. Italia? Venerdì sera meglio non aspettarsi miracoli."

🚫 MAI: Battute offensive, monologhi >50 parole',
  true,
  10,
  ARRAY['logistica', 'trasporti'],
  now(),
  now()
) ON CONFLICT (id) DO UPDATE SET
  content = EXCLUDED.content,
  is_active = EXCLUDED.is_active,
  topic_tags = EXCLUDED.topic_tags,
  updated_at = now();

-- =====================================================
-- TOPIC OBJECTIVES
-- =====================================================

-- 1. Consulenza Logistica
INSERT INTO public.chat_laboratory_prompt_sections (
  id,
  section_name,
  section_type,
  content,
  is_active,
  order_priority,
  topic_tags,
  created_at,
  updated_at
) VALUES (
  '87a0e55b-8904-4539-b7bd-7ed9e3b863f8',
  'Obiettivo: Consulenza Logistica',
  'topic_objective',
  '🎯 OBIETTIVO CONVERSAZIONE: Fornire consulenza su trasporti internazionali, spedizioni, dogane, e scelta corrieri.

📦 FOCUS:
- Incoterms e modalità di trasporto
- Tempi e costi stimati
- Gestione pratiche doganali
- Scelta corriere ottimale

RICORDA: Risposte pratiche e actionable.',
  true,
  20,
  ARRAY['logistica', 'trasporti'],
  now(),
  now()
) ON CONFLICT (id) DO UPDATE SET
  content = EXCLUDED.content,
  is_active = EXCLUDED.is_active,
  topic_tags = EXCLUDED.topic_tags,
  updated_at = now();

-- 2. Discussione Medica
INSERT INTO public.chat_laboratory_prompt_sections (
  id,
  section_name,
  section_type,
  content,
  is_active,
  order_priority,
  topic_tags,
  created_at,
  updated_at
) VALUES (
  '66808b90-08ff-45bc-84fe-78c4c24b1d6e',
  'Obiettivo: Discussione Medica',
  'topic_objective',
  '🎯 OBIETTIVO CONVERSAZIONE: Analizzare casi clinici, diagnosi differenziali, e linee guida terapeutiche.

🏥 FOCUS:
- Approccio evidence-based
- Diagnosi differenziale
- Protocolli terapeutici aggiornati
- Considerazioni su complicanze

RICORDA: Base scientifica e linee guida internazionali.',
  true,
  20,
  ARRAY['medico', 'medicina', 'clinica'],
  now(),
  now()
) ON CONFLICT (id) DO UPDATE SET
  content = EXCLUDED.content,
  is_active = EXCLUDED.is_active,
  topic_tags = EXCLUDED.topic_tags,
  updated_at = now();

-- 3. Consulenza Fiscale
INSERT INTO public.chat_laboratory_prompt_sections (
  id,
  section_name,
  section_type,
  content,
  is_active,
  order_priority,
  topic_tags,
  created_at,
  updated_at
) VALUES (
  'd4717c5d-908d-45d9-997e-8f995ce46629',
  'Obiettivo: Consulenza Fiscale',
  'topic_objective',
  '🎯 OBIETTIVO CONVERSAZIONE: Fornire consulenza su normative fiscali, ottimizzazione tributaria, e compliance.

💼 FOCUS:
- Normativa italiana ed europea aggiornata
- Ottimizzazione legale del carico fiscale
- Scadenze e adempimenti
- Rischi e opportunità

RICORDA: Precisione normativa e riferimenti legislativi quando possibile.',
  true,
  20,
  ARRAY['fiscale', 'tributario', 'fisco'],
  now(),
  now()
) ON CONFLICT (id) DO UPDATE SET
  content = EXCLUDED.content,
  is_active = EXCLUDED.is_active,
  topic_tags = EXCLUDED.topic_tags,
  updated_at = now();

-- =====================================================
-- END PROMPT SECTIONS
-- =====================================================
