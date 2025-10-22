-- ========================================
-- TABLE: project_source_files
-- Purpose: Store project source code for Albert Advisor agents access
-- ========================================

CREATE TABLE IF NOT EXISTS project_source_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'tsx', 'ts', 'json', 'md', 'sql'
  file_size INTEGER NOT NULL,
  line_count INTEGER NOT NULL,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Metadata per analisi rapida
  imports JSONB DEFAULT '[]'::jsonb,
  exports JSONB DEFAULT '[]'::jsonb,
  has_hooks BOOLEAN DEFAULT FALSE,
  has_supabase_queries BOOLEAN DEFAULT FALSE,
  
  -- Full-text search
  content_search TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', content)) STORED
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_project_files_path ON project_source_files(file_path);
CREATE INDEX IF NOT EXISTS idx_project_files_type ON project_source_files(file_type);
CREATE INDEX IF NOT EXISTS idx_project_files_search ON project_source_files USING GIN(content_search);
CREATE INDEX IF NOT EXISTS idx_project_files_synced ON project_source_files(last_synced_at DESC);

-- RLS Policies
ALTER TABLE project_source_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view source files"
  ON project_source_files
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage source files"
  ON project_source_files
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);