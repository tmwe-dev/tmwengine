-- ✅ COLLEAGUES STYLE: Aggiungi conversation style mancante (Fix v2)
-- Fix warning: "⚠️ Stile 'colleagues' non trovato in DB, uso fallback hardcoded"

-- Prima rimuovi eventuali duplicati
DELETE FROM chat_laboratory_prompt_sections 
WHERE section_type = 'CONVERSATION_STYLE' 
  AND section_name = 'colleagues';

-- Poi inserisci il nuovo style
INSERT INTO chat_laboratory_prompt_sections (
  section_type, 
  section_name, 
  content, 
  is_active, 
  order_priority
) VALUES (
  'CONVERSATION_STYLE',
  'colleagues',
  'Tono colloquiale e professionale tra colleghi. Comunicate in modo diretto, efficiente e collaborativo. Evitate formalismi eccessivi ma mantenete rispetto reciproco. Siate concisi e pratici.',
  true,
  1
);

-- Verifica
SELECT section_type, section_name, LENGTH(content) as content_length, is_active
FROM chat_laboratory_prompt_sections 
WHERE section_name = 'colleagues';