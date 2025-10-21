-- Create debugging table for page audit reports
CREATE TABLE IF NOT EXISTS debugging (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  
  -- Page identification
  page_route TEXT NOT NULL,
  page_name TEXT NOT NULL,
  page_file_path TEXT,
  
  -- Components and functions analysis (JSONB)
  components JSONB DEFAULT '[]'::jsonb,
  functions_detected JSONB DEFAULT '[]'::jsonb,
  hooks_detected JSONB DEFAULT '[]'::jsonb,
  
  -- Function status map: {function_name: "active"|"inactive"|"suspect"}
  function_status_map JSONB DEFAULT '{}'::jsonb,
  
  -- Dependencies and links
  linked_pages JSONB DEFAULT '[]'::jsonb,
  imports_detected JSONB DEFAULT '[]'::jsonb,
  exports_detected JSONB DEFAULT '[]'::jsonb,
  
  -- Supabase queries detected
  queries_detected JSONB DEFAULT '[]'::jsonb,
  tables_used JSONB DEFAULT '[]'::jsonb,
  
  -- Edge functions called
  edge_functions_called JSONB DEFAULT '[]'::jsonb,
  
  -- Hardcode and issues detected
  hardcoded_issues JSONB DEFAULT '[]'::jsonb,
  orphan_functions JSONB DEFAULT '[]'::jsonb,
  naming_mismatches JSONB DEFAULT '[]'::jsonb,
  
  -- Metrics
  total_functions INTEGER DEFAULT 0,
  active_functions INTEGER DEFAULT 0,
  inactive_functions INTEGER DEFAULT 0,
  suspect_functions INTEGER DEFAULT 0,
  complexity_score INTEGER DEFAULT 0,
  
  -- Editable notes
  notes TEXT,
  
  -- Metadata
  scan_timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_debugging_page_route ON debugging(page_route);
CREATE INDEX idx_debugging_user_id ON debugging(user_id);
CREATE INDEX idx_debugging_scan_timestamp ON debugging(scan_timestamp DESC);

-- Enable RLS
ALTER TABLE debugging ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own debugging reports"
  ON debugging FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own debugging reports"
  ON debugging FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own debugging reports"
  ON debugging FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own debugging reports"
  ON debugging FOR DELETE
  USING (auth.uid() = user_id);