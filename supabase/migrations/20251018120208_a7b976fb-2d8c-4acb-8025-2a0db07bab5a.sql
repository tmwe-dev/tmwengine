-- Tabella per configurazione pricing AI
CREATE TABLE ai_pricing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  cost_input_eur NUMERIC NOT NULL DEFAULT 0,
  cost_output_eur NUMERIC NOT NULL DEFAULT 0,
  is_free BOOLEAN NOT NULL DEFAULT false,
  usd_eur_rate NUMERIC NOT NULL DEFAULT 0.95,
  last_sync_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(provider, model)
);

-- Popola con dati iniziali (conversione €1 = $1.05 → rate 0.95)
INSERT INTO ai_pricing_config (provider, model, cost_input_eur, cost_output_eur, is_free) VALUES
  -- OpenAI (già in EUR da tabella utente)
  ('openai', 'gpt-5-2025-08-07', 2.50, 10.00, false),
  ('openai', 'gpt-5-mini-2025-08-07', 0.15, 0.60, false),
  ('openai', 'gpt-5-nano-2025-08-07', 0.04, 0.16, false),
  ('openai', 'gpt-4.1-2025-04-14', 2.00, 8.00, false),
  ('openai', 'o3-2025-04-16', 10.00, 40.00, false),
  ('openai', 'o4-mini-2025-04-16', 1.00, 4.00, false),
  
  -- Anthropic (già in EUR)
  ('anthropic', 'claude-sonnet-4-5', 3.00, 15.00, false),
  ('anthropic', 'claude-opus-4-1-20250805', 15.00, 75.00, false),
  ('anthropic', 'claude-sonnet-4-20250514', 3.00, 15.00, false),
  ('anthropic', 'claude-3-5-haiku-20241022', 0.80, 4.00, false),
  
  -- Google Gemini VIA LOVABLE AI = GRATIS
  ('google', 'gemini-2.5-pro', 0, 0, true),
  ('google', 'gemini-2.5-flash', 0, 0, true),
  ('google', 'gemini-2.5-flash-lite', 0, 0, true),
  
  -- Lovable AI Gateway (Gemini free)
  ('lovable', 'google/gemini-2.5-flash', 0, 0, true),
  ('lovable', 'google/gemini-2.5-pro', 0, 0, true),
  ('lovable', 'google/gemini-2.5-flash-lite', 0, 0, true);

-- Trigger per updated_at
CREATE TRIGGER update_ai_pricing_config_updated_at
  BEFORE UPDATE ON ai_pricing_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE ai_pricing_config ENABLE ROW LEVEL SECURITY;

-- Tutti possono leggere pricing
CREATE POLICY "Anyone can view pricing"
  ON ai_pricing_config FOR SELECT
  USING (true);