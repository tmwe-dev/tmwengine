-- INCREMENTI 7-9: Advanced Features
-- Tabelle per: Tools esterni + Auto-execute config + Response generation

-- 🔧 INCREMENTO 7: Email Tools Config (calendario, CRM, etc.)
CREATE TABLE IF NOT EXISTS public.email_tools_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tool_name TEXT NOT NULL, -- 'calendar', 'crm', 'tasks', 'knowledge_base'
  tool_type TEXT NOT NULL, -- 'calendar', 'crm', 'productivity'
  is_enabled BOOLEAN DEFAULT true,
  config_data JSONB, -- tool-specific configuration
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, tool_name)
);

CREATE INDEX idx_email_tools_config_user ON public.email_tools_config(user_id);
CREATE INDEX idx_email_tools_config_enabled ON public.email_tools_config(user_id, is_enabled);

ALTER TABLE public.email_tools_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own tools config"
ON public.email_tools_config
FOR ALL
USING (auth.uid() = user_id);

-- 🤖 INCREMENTO 9: Email Automation Config (auto-execute settings)
CREATE TABLE IF NOT EXISTS public.email_automation_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  auto_execute_enabled BOOLEAN DEFAULT false,
  confidence_threshold DECIMAL(3,2) DEFAULT 0.90, -- 0.00 to 1.00
  allowed_auto_actions TEXT[] DEFAULT ARRAY['archive', 'delete', 'mark_urgent'], -- azioni eseguibili automaticamente
  require_confirmation_actions TEXT[] DEFAULT ARRAY['reply', 'forward', 'create_task'], -- richiedono conferma
  max_auto_actions_per_day INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_email_automation_config_user ON public.email_automation_config(user_id);

ALTER TABLE public.email_automation_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own automation config"
ON public.email_automation_config
FOR ALL
USING (auth.uid() = user_id);

-- 📊 Tabella per tracking esecuzioni automatiche
CREATE TABLE IF NOT EXISTS public.email_auto_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email_uid TEXT NOT NULL,
  action_type TEXT NOT NULL,
  confidence DECIMAL(3,2) NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT now(),
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  metadata JSONB
);

CREATE INDEX idx_auto_execution_user_date ON public.email_auto_execution_log(user_id, executed_at DESC);
CREATE INDEX idx_auto_execution_email ON public.email_auto_execution_log(email_uid);

ALTER TABLE public.email_auto_execution_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own auto execution logs"
ON public.email_auto_execution_log
FOR SELECT
USING (auth.uid() = user_id);

-- Trigger per updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_email_tools_config_updated_at
BEFORE UPDATE ON public.email_tools_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_automation_config_updated_at
BEFORE UPDATE ON public.email_automation_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();