-- Create voice_agent_config table for Bar Mode orchestrator
CREATE TABLE IF NOT EXISTS voice_agent_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN DEFAULT true,
  elevenlabs_api_key TEXT NOT NULL,
  agent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE voice_agent_config ENABLE ROW LEVEL SECURITY;

-- Allow service_role to read (for edge functions)
CREATE POLICY "Service role can read voice config"
ON voice_agent_config FOR SELECT
TO service_role
USING (true);

-- Allow authenticated users to read their config
CREATE POLICY "Authenticated users can read voice config"
ON voice_agent_config FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert/update
CREATE POLICY "Authenticated users can manage voice config"
ON voice_agent_config FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);