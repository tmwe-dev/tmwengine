-- FASE 2: Rinomina campo personality_prompt → text_generation_prompt
ALTER TABLE elevenlabs_agents 
RENAME COLUMN personality_prompt TO text_generation_prompt;

-- Aggiungi commento esplicativo
COMMENT ON COLUMN elevenlabs_agents.text_generation_prompt IS 
'Prompt usato SOLO per generazione testo AI (GPT/Claude/Gemini). 
NON influenza la personalità vocale ElevenLabs configurata su piattaforma elevenlabs.io.
Se esistono sezioni modulari agent_personality, quelle hanno priorità.';

-- FASE 3: Constraint unicità per agent_personality
CREATE UNIQUE INDEX idx_agent_personality_unique 
ON chat_laboratory_prompt_sections(section_name) 
WHERE section_type = 'agent_personality' AND is_active = true;