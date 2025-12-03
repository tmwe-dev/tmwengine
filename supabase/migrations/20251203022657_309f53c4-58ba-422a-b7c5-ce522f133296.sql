-- ============================================
-- TMWE V3.1 MIGRATION: Fresh Start Tables
-- ============================================

-- 1. TMWE_CLASSIFICATIONS TABLE
-- Optimized table for AI email classifications
CREATE TABLE public.tmwe_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tmwe_email_id BIGINT NOT NULL,
  user_email TEXT NOT NULL,
  group_name TEXT NOT NULL,
  group_color TEXT DEFAULT '#6366f1',
  group_icon TEXT DEFAULT 'tag',
  confidence NUMERIC(3,2) DEFAULT 0.85,
  ai_model TEXT DEFAULT 'gpt-4o-mini',
  ai_reasoning TEXT,
  subject_preview TEXT,
  sender_email TEXT,
  sender_name TEXT,
  is_manual_override BOOLEAN DEFAULT false,
  classification_date TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tmwe_email_id, user_email)
);

-- Indexes for tmwe_classifications
CREATE INDEX idx_tmwe_class_user_email ON public.tmwe_classifications(user_email);
CREATE INDEX idx_tmwe_class_tmwe_email_id ON public.tmwe_classifications(tmwe_email_id);
CREATE INDEX idx_tmwe_class_group_name ON public.tmwe_classifications(group_name);
CREATE INDEX idx_tmwe_class_sender ON public.tmwe_classifications(sender_email);
CREATE INDEX idx_tmwe_class_status ON public.tmwe_classifications(status);
CREATE INDEX idx_tmwe_class_date ON public.tmwe_classifications(classification_date DESC);

-- RLS for tmwe_classifications
ALTER TABLE public.tmwe_classifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own classifications"
  ON public.tmwe_classifications FOR SELECT
  USING (user_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can insert own classifications"
  ON public.tmwe_classifications FOR INSERT
  WITH CHECK (user_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can update own classifications"
  ON public.tmwe_classifications FOR UPDATE
  USING (user_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can delete own classifications"
  ON public.tmwe_classifications FOR DELETE
  USING (user_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- 2. TMWE_SENDER_PROFILES TABLE
-- Unified sender profiles with denormalized stats
CREATE TABLE public.tmwe_sender_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  sender_name TEXT,
  sender_domain TEXT,
  group_name TEXT NOT NULL DEFAULT 'Sin Clasificar',
  group_color TEXT DEFAULT '#6b7280',
  group_icon TEXT DEFAULT 'inbox',
  group_type TEXT DEFAULT 'auto' CHECK (group_type IN ('auto', 'manual', 'ai_suggested')),
  email_count INTEGER DEFAULT 0,
  unread_count INTEGER DEFAULT 0,
  last_email_at TIMESTAMPTZ,
  first_email_at TIMESTAMPTZ DEFAULT now(),
  is_favorite BOOLEAN DEFAULT false,
  is_blocked BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_email, sender_email)
);

-- Indexes for tmwe_sender_profiles
CREATE INDEX idx_tmwe_sender_user ON public.tmwe_sender_profiles(user_email);
CREATE INDEX idx_tmwe_sender_email ON public.tmwe_sender_profiles(sender_email);
CREATE INDEX idx_tmwe_sender_domain ON public.tmwe_sender_profiles(sender_domain);
CREATE INDEX idx_tmwe_sender_group ON public.tmwe_sender_profiles(group_name);
CREATE INDEX idx_tmwe_sender_active ON public.tmwe_sender_profiles(is_active);
CREATE INDEX idx_tmwe_sender_last_email ON public.tmwe_sender_profiles(last_email_at DESC);

-- RLS for tmwe_sender_profiles
ALTER TABLE public.tmwe_sender_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sender profiles"
  ON public.tmwe_sender_profiles FOR SELECT
  USING (user_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can insert own sender profiles"
  ON public.tmwe_sender_profiles FOR INSERT
  WITH CHECK (user_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can update own sender profiles"
  ON public.tmwe_sender_profiles FOR UPDATE
  USING (user_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can delete own sender profiles"
  ON public.tmwe_sender_profiles FOR DELETE
  USING (user_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- 3. TMWE_CLASSIFICATION_RULES TABLE
-- Simplified rules for automatic classification
CREATE TABLE public.tmwe_classification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  rule_name TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('global', 'sender', 'domain', 'subject')),
  match_value TEXT NOT NULL,
  match_type TEXT DEFAULT 'exact' CHECK (match_type IN ('exact', 'contains', 'regex', 'starts_with', 'ends_with')),
  target_group TEXT NOT NULL,
  target_color TEXT DEFAULT '#6366f1',
  target_icon TEXT DEFAULT 'tag',
  priority INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT true,
  auto_apply BOOLEAN DEFAULT true,
  hit_count INTEGER DEFAULT 0,
  last_hit_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for tmwe_classification_rules
CREATE INDEX idx_tmwe_rules_user ON public.tmwe_classification_rules(user_email);
CREATE INDEX idx_tmwe_rules_scope ON public.tmwe_classification_rules(scope);
CREATE INDEX idx_tmwe_rules_active ON public.tmwe_classification_rules(is_active);
CREATE INDEX idx_tmwe_rules_priority ON public.tmwe_classification_rules(priority DESC);

-- RLS for tmwe_classification_rules
ALTER TABLE public.tmwe_classification_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rules"
  ON public.tmwe_classification_rules FOR SELECT
  USING (user_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can insert own rules"
  ON public.tmwe_classification_rules FOR INSERT
  WITH CHECK (user_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can update own rules"
  ON public.tmwe_classification_rules FOR UPDATE
  USING (user_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can delete own rules"
  ON public.tmwe_classification_rules FOR DELETE
  USING (user_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- 4. HELPER FUNCTION: increment_sender_stats
CREATE OR REPLACE FUNCTION public.increment_sender_stats(
  p_user_email TEXT,
  p_sender_email TEXT,
  p_increment_count INTEGER DEFAULT 1,
  p_is_unread BOOLEAN DEFAULT false
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE tmwe_sender_profiles
  SET 
    email_count = email_count + p_increment_count,
    unread_count = CASE WHEN p_is_unread THEN unread_count + p_increment_count ELSE unread_count END,
    last_email_at = now(),
    updated_at = now()
  WHERE user_email = p_user_email AND sender_email = p_sender_email;
END;
$$;

-- 5. TRIGGER: Auto-update updated_at
CREATE TRIGGER update_tmwe_classifications_updated_at
  BEFORE UPDATE ON public.tmwe_classifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tmwe_sender_profiles_updated_at
  BEFORE UPDATE ON public.tmwe_sender_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tmwe_classification_rules_updated_at
  BEFORE UPDATE ON public.tmwe_classification_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();