-- Step 1: Rimuovi il constraint esistente
ALTER TABLE chat_laboratory_prompt_sections 
DROP CONSTRAINT IF EXISTS chat_laboratory_prompt_sections_section_type_check;

-- Step 2: Non aggiungere alcun constraint (permetti qualsiasi valore per section_type)
-- Questo permette massima flessibilità per aggiungere nuovi tipi in futuro

-- Step 3: Inserisci i 3 stili conversazione esistenti come sezioni editabili
INSERT INTO chat_laboratory_prompt_sections (
  section_type, section_name, content, is_active, order_priority
) VALUES
  ('CONVERSATION_STYLE', 'boss_talk', '🎯 STILE: Boss Talk (Pragmatico e Sintetico)
- MAX 50-60 parole (~4 frasi brevi)
- Focus su: decisioni, ROI, trade-off, next steps
- Taglia tutto ciò che non è direttamente azionabile
- Usa dati concreti: "Secondo benchmark X, l''opzione A costa il 30% in meno"
- Tono diretto: "Dobbiamo decidere tra A e B. Pro di A: [lista]. Vai con B?"', true, 1),
  
  ('CONVERSATION_STYLE', 'colleagues', '🤝 STILE: Colleghi (Professionale ma Amichevole)
- MAX 60-70 parole (~5 frasi)
- Bilanciato tra tecnico e accessibile
- Coinvolgi gli altri: "Come vedi tu [nome], sarebbe fattibile con i nostri constraint?"
- Puoi usare metafore o esempi pratici
- Tono collaborativo ma non eccessivamente formale', true, 2),
  
  ('CONVERSATION_STYLE', 'bar_chat', '🍺 STILE: Bar Chat (Informale e Rilassato)
- MAX 40-50 parole (~3 frasi)
- Attacco conversazionale: "Guarda...", "Senti...", "Allora..."
- Scherzoso quando appropriato, ma non forzato
- Coinvolgi con domande dirette: "Tu [nome], lo faresti diversamente?"
- Tono da bar, non da conferenza: evita "in conclusione", "per riassumere"', true, 3)
ON CONFLICT DO NOTHING;