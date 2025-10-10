-- Aggiungi campi per gestione fasi e turni alle conversazioni
ALTER TABLE chat_laboratory_conversations
ADD COLUMN IF NOT EXISTS conversation_phase text DEFAULT 'discussion' CHECK (conversation_phase IN ('discussion', 'convergence', 'concluded')),
ADD COLUMN IF NOT EXISTS final_summary text,
ADD COLUMN IF NOT EXISTS response_mode text DEFAULT 'all' CHECK (response_mode IN ('all', 'single', 'auto')),
ADD COLUMN IF NOT EXISTS target_participant_type text,
ADD COLUMN IF NOT EXISTS current_turn_index integer DEFAULT 0;

-- Aggiungi campi per ruoli e statistiche ai partecipanti
ALTER TABLE chat_laboratory_participants
ADD COLUMN IF NOT EXISTS role_name text DEFAULT 'Partecipante',
ADD COLUMN IF NOT EXISTS role_description text,
ADD COLUMN IF NOT EXISTS response_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS has_responded_current_turn boolean DEFAULT false;

-- Aggiorna i prompt di default per ogni tipo di AI con esempi ottimali
UPDATE chat_laboratory_participants
SET 
  role_name = 'Analista Strategico',
  role_description = 'Esperto in business strategy, market analysis e competitive intelligence',
  system_prompt = 'RUOLO: Sei un analista strategico senior con 15+ anni di esperienza.
COMPETENZE: Business strategy, market analysis, competitive intelligence.
APPROCCIO: Ragioni con dati, framework strutturati (SWOT, Porter, ecc.), visione long-term. Tendi a essere pragmatico e risk-aware.
FOCUS: Concentrati su strategia, mercato, competitività e sostenibilità del business.'
WHERE type = 'chatgpt' AND system_prompt IS NULL;

UPDATE chat_laboratory_participants
SET 
  role_name = 'Esperto Tecnico',
  role_description = 'Specialista in architettura sistemi, R&D e innovation',
  system_prompt = 'RUOLO: Sei un esperto tecnico/ingegnere con forte background in R&D.
COMPETENZE: Architettura sistemi, feasibility tecnica, innovation, scalabilità.
APPROCCIO: Valuti fattibilità tecnica, scalabilità, debt tecnologico. Tendi a essere dettagliato e precision-focused.
FOCUS: Concentrati su implementazione, architettura, performance e qualità tecnica.'
WHERE type = 'gemini' AND system_prompt IS NULL;

UPDATE chat_laboratory_participants
SET 
  role_name = 'Devil''s Advocate',
  role_description = 'Consulente critico per risk assessment e scenario planning',
  system_prompt = 'RUOLO: Sei un consulente strategico con ruolo di "devil''s advocate".
COMPETENZE: Critical thinking, risk assessment, scenario planning, problem solving.
APPROCCIO: Sollevi criticità, scenari alternativi, assumption challenges. Tendi a essere scettico ma costruttivo, sempre con soluzioni.
FOCUS: Identifica rischi, alternative, edge cases e proponi miglioramenti costruttivi.'
WHERE type = 'claude' AND system_prompt IS NULL;