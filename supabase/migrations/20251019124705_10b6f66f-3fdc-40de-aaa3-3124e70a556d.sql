-- Abilita estensione pg_trgm per ricerca fuzzy
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Tabella per indicizzare il codice sorgente
CREATE TABLE IF NOT EXISTS code_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path TEXT NOT NULL UNIQUE,
  file_type TEXT NOT NULL,
  content TEXT NOT NULL,
  language TEXT DEFAULT 'typescript',
  
  -- Metadati analisi codice
  imports JSONB DEFAULT '[]'::jsonb,
  exports JSONB DEFAULT '[]'::jsonb,
  functions JSONB DEFAULT '[]'::jsonb,
  components JSONB DEFAULT '[]'::jsonb,
  dependencies JSONB DEFAULT '[]'::jsonb,
  
  -- Metriche
  line_count INTEGER,
  token_count INTEGER,
  complexity_score INTEGER DEFAULT 0,
  
  -- Timestamp
  last_updated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Full text search
  content_tsvector TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', content)) STORED
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_code_index_file_type ON code_index(file_type);
CREATE INDEX IF NOT EXISTS idx_code_index_file_path ON code_index USING gin(file_path gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_code_index_content_search ON code_index USING gin(content_tsvector);

-- Tabella per proposte di modifica codice
CREATE TABLE IF NOT EXISTS code_change_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path TEXT NOT NULL,
  original_code TEXT,
  proposed_code TEXT NOT NULL,
  
  -- Motivazione e contesto
  reason TEXT NOT NULL,
  change_type TEXT DEFAULT 'modification',
  impact_level TEXT DEFAULT 'low',
  
  -- Diff e validazione
  diff TEXT,
  syntax_valid BOOLEAN DEFAULT NULL,
  has_breaking_changes BOOLEAN DEFAULT false,
  affected_dependencies JSONB DEFAULT '[]'::jsonb,
  
  -- Workflow
  status TEXT DEFAULT 'pending',
  created_by_ai BOOLEAN DEFAULT true,
  approved_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_proposals_status ON code_change_proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_file_path ON code_change_proposals(file_path);
CREATE INDEX IF NOT EXISTS idx_proposals_impact ON code_change_proposals(impact_level);

-- RLS Policies
ALTER TABLE code_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_change_proposals ENABLE ROW LEVEL SECURITY;

-- Chiunque può leggere code_index
DROP POLICY IF EXISTS "Anyone can view code index" ON code_index;
CREATE POLICY "Anyone can view code index"
  ON code_index FOR SELECT
  USING (true);

-- Solo admin possono modificare code_index
DROP POLICY IF EXISTS "Admin can manage code index" ON code_index;
CREATE POLICY "Admin can manage code index"
  ON code_index FOR ALL
  USING (is_admin(auth.uid()));

-- Chiunque può vedere proposte
DROP POLICY IF EXISTS "Anyone can view proposals" ON code_change_proposals;
CREATE POLICY "Anyone can view proposals"
  ON code_change_proposals FOR SELECT
  USING (true);

-- Sistema può creare proposte
DROP POLICY IF EXISTS "System can create proposals" ON code_change_proposals;
CREATE POLICY "System can create proposals"
  ON code_change_proposals FOR INSERT
  WITH CHECK (true);

-- Solo admin possono approvare/rigettare
DROP POLICY IF EXISTS "Admin can update proposals" ON code_change_proposals;
CREATE POLICY "Admin can update proposals"
  ON code_change_proposals FOR UPDATE
  USING (is_admin(auth.uid()));