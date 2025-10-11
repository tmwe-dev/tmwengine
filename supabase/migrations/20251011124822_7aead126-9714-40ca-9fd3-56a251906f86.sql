-- Crea indice univoco per prevenire duplicati elevenlabs_agent_id per lo stesso user
CREATE UNIQUE INDEX IF NOT EXISTS idx_elevenlabs_agents_user_agent 
ON elevenlabs_agents(user_id, elevenlabs_agent_id);