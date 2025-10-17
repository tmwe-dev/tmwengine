-- Tabella per i risultati dei test orchestrator
CREATE TABLE IF NOT EXISTS orchestrator_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  conversation_id UUID REFERENCES chat_laboratory_conversations(id),
  test_config JSONB NOT NULL,
  input_message TEXT NOT NULL,
  selected_agent TEXT,
  response_time_ms INTEGER,
  tokens_input INTEGER,
  tokens_output INTEGER,
  success BOOLEAN,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabella per le configurazioni salvate
CREATE TABLE IF NOT EXISTS orchestrator_test_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  config_name TEXT NOT NULL,
  turn_strategy TEXT,
  pause_between_turns_ms INTEGER,
  enable_direct_calls BOOLEAN,
  selected_topic TEXT,
  active_kb_id UUID,
  voice_enabled BOOLEAN DEFAULT false,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies per orchestrator_test_results
ALTER TABLE orchestrator_test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own test results"
  ON orchestrator_test_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own test results"
  ON orchestrator_test_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own test results"
  ON orchestrator_test_results FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies per orchestrator_test_configs
ALTER TABLE orchestrator_test_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own test configs"
  ON orchestrator_test_configs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own test configs"
  ON orchestrator_test_configs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own test configs"
  ON orchestrator_test_configs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own test configs"
  ON orchestrator_test_configs FOR DELETE
  USING (auth.uid() = user_id);

-- Indici per performance
CREATE INDEX idx_test_results_user ON orchestrator_test_results(user_id, created_at DESC);
CREATE INDEX idx_test_results_conversation ON orchestrator_test_results(conversation_id);
CREATE INDEX idx_test_configs_user ON orchestrator_test_configs(user_id);

-- Trigger per updated_at
CREATE TRIGGER update_orchestrator_test_configs_updated_at
  BEFORE UPDATE ON orchestrator_test_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();