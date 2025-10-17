-- Create table for AI Calibration Configurations
CREATE TABLE IF NOT EXISTS chat_laboratory_calibration_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_name TEXT NOT NULL,
  
  -- Resilience parameters
  timeout_ms INTEGER DEFAULT 8000,
  max_retries INTEGER DEFAULT 2,
  base_delay_ms INTEGER DEFAULT 300,
  
  -- Context parameters
  context_limit INTEGER DEFAULT 20,
  economy_mode BOOLEAN DEFAULT true,
  kb_match_threshold NUMERIC(3,2) DEFAULT 0.7,
  kb_match_count INTEGER DEFAULT 3,
  
  -- AI Provider parameters
  temperature NUMERIC(3,2) DEFAULT 0.8,
  max_tokens INTEGER DEFAULT 1500,
  top_p NUMERIC(3,2) DEFAULT 0.9,
  
  -- Turn strategy
  turn_strategy TEXT DEFAULT 'RANDOM_30',
  smart_weights JSONB DEFAULT '{"expertise": 50, "balance": 30, "freshness": 20}'::jsonb,
  
  -- Audio/Voice parameters
  vad_silence_duration INTEGER DEFAULT 3000,
  conversation_style TEXT DEFAULT 'colleagues',
  
  -- Status
  is_active BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_temperature CHECK (temperature >= 0 AND temperature <= 2),
  CONSTRAINT valid_top_p CHECK (top_p >= 0 AND top_p <= 1),
  CONSTRAINT valid_kb_threshold CHECK (kb_match_threshold >= 0.5 AND kb_match_threshold <= 0.95)
);

-- Enable RLS
ALTER TABLE chat_laboratory_calibration_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view calibration configs"
  ON chat_laboratory_calibration_configs
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can manage calibration configs"
  ON chat_laboratory_calibration_configs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_calibration_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_calibration_configs_timestamp
BEFORE UPDATE ON chat_laboratory_calibration_configs
FOR EACH ROW
EXECUTE FUNCTION update_calibration_configs_updated_at();