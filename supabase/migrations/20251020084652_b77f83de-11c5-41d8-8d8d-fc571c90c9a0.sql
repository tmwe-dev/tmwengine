-- Create project_history table for tracking modifications
CREATE TABLE IF NOT EXISTS public.project_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  operation TEXT NOT NULL,
  file_modified TEXT,
  tables_modified TEXT[],
  user_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.project_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own history"
  ON public.project_history FOR SELECT
  USING (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "System can insert history"
  ON public.project_history FOR INSERT
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_project_history_timestamp ON public.project_history(timestamp DESC);
CREATE INDEX idx_project_history_user ON public.project_history(user_id);