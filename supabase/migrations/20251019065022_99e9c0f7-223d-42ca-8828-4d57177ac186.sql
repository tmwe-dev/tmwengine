-- Aggiungere prompt_id agli agenti vocali
ALTER TABLE elevenlabs_agents 
ADD COLUMN prompt_id UUID REFERENCES chat_laboratory_prompt_sections(id);

-- Indice per performance
CREATE INDEX idx_elevenlabs_agents_prompt_id ON elevenlabs_agents(prompt_id);

-- Associare agenti esistenti alle personalità modulari
UPDATE elevenlabs_agents 
SET prompt_id = (SELECT id FROM chat_laboratory_prompt_sections WHERE section_name = 'Renny - Esperto Logistica' AND section_type = 'agent_personality')
WHERE name = 'Renny - GPT';

UPDATE elevenlabs_agents 
SET prompt_id = (SELECT id FROM chat_laboratory_prompt_sections WHERE section_name = 'Vittorio - Facilitatore Strategico' AND section_type = 'agent_personality')
WHERE name = 'Vittorio - Gemini';

UPDATE elevenlabs_agents 
SET prompt_id = (SELECT id FROM chat_laboratory_prompt_sections WHERE section_name = 'Tonino - Tecnico Senior' AND section_type = 'agent_personality')
WHERE name = 'Tonino - Anthropic';