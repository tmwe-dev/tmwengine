-- ============================================
-- FASE 1: Pulizia limiti hardcoded dai prompt
-- ============================================

-- Pulisci CONVERSATION_STYLE da limiti hardcoded
UPDATE chat_laboratory_prompt_sections
SET content = REGEXP_REPLACE(
  content, 
  '- MAX \d+-\d+ parole[^\n]*\n', 
  '', 
  'g'
),
updated_at = NOW()
WHERE section_type = 'CONVERSATION_STYLE';

-- Pulisci BASE da limiti hardcoded
UPDATE chat_laboratory_prompt_sections
SET content = REGEXP_REPLACE(
  REGEXP_REPLACE(
    content,
    '(max|MAX) \d+-?\d* (parole|word|PAROLE)[^\n]*\n',
    '',
    'gi'
  ),
  'MASSIMO \d+-\d+ PAROLE[^\n]*\n',
  '',
  'gi'
),
updated_at = NOW()
WHERE section_type = 'BASE';

-- Pulisci AGENT_PERSONALITY da limiti hardcoded
UPDATE chat_laboratory_prompt_sections
SET content = REGEXP_REPLACE(
  REGEXP_REPLACE(
    content,
    '(VINCOLI:|MAX) \d+-\d+ parole[^\n]*\n',
    '',
    'gi'
  ),
  'max \d+ parole[^\n]*\n',
  '',
  'gi'
),
updated_at = NOW()
WHERE section_type = 'AGENT_PERSONALITY';

-- ============================================
-- FASE 5: Aggiorna prompt agenti con istruzioni
-- ============================================

UPDATE chat_laboratory_prompt_sections
SET content = content || E'\n\n## GESTIONE LUNGHEZZA RISPOSTA\n\nL''orchestrator ti comunicherà un limite specifico di parole tramite istruzione dinamica.\n**RISPETTA SEMPRE** questo limite con priorità assoluta.\n\nTecniche per rimanere nel limite:\n- Elimina premesse non necessarie\n- Usa elenchi puntati per compattare\n- Delega approfondimenti ad appendici [APPENDICE]...[/APPENDICE]\n- Se serve più spazio, usa formato report [REPORT]...[/REPORT]\n\nIl limite dinamico SOVRASCRIVE qualsiasi altra istruzione generica sulla lunghezza.',
    updated_at = NOW()
WHERE (
  section_name ILIKE '%renny%' 
  OR section_name ILIKE '%tonino%' 
  OR section_name ILIKE '%vittorio%'
)
AND section_type = 'AGENT_PERSONALITY'
AND content NOT LIKE '%GESTIONE LUNGHEZZA RISPOSTA%';