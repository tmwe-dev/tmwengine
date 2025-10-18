-- Aggiungi sezione prompt orchestrator
INSERT INTO chat_laboratory_prompt_sections (
  section_type,
  section_name,
  content,
  is_active,
  order_priority
) VALUES (
  'ORCHESTRATOR_RULES',
  'Regole Orchestrator',
  'Leggi l''ultimo messaggio. Se contiene una DOMANDA o RICHIESTA verso altri (es: "cosa ne pensate?", "@Claude", "@ChatGPT", "@Gemini", "ragazzi", "tu [nome]", "qualcuno", "voi"), rispondi con JSON: {"continue": true}. Altrimenti: {"continue": false}. Sii preciso: cerca domande dirette o richieste di opinione.',
  true,
  1
) ON CONFLICT DO NOTHING;