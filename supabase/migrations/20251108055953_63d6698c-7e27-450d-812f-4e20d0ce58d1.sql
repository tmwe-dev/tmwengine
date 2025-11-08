-- Create brain_code_scans table
CREATE TABLE public.brain_code_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_type text NOT NULL,
  files_scanned integer NOT NULL DEFAULT 0,
  functions_found integer NOT NULL DEFAULT 0,
  duplicates_detected integer NOT NULL DEFAULT 0,
  shared_functions integer NOT NULL DEFAULT 0,
  heavy_functions integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create brain_function_analysis table
CREATE TABLE public.brain_function_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path text NOT NULL,
  function_name text NOT NULL,
  function_signature text NOT NULL,
  lines_of_code integer NOT NULL DEFAULT 0,
  cyclomatic_complexity integer NOT NULL DEFAULT 1,
  dependencies text[] DEFAULT ARRAY[]::text[],
  is_duplicate boolean NOT NULL DEFAULT false,
  duplicate_of text,
  is_shared boolean NOT NULL DEFAULT false,
  shared_in_files text[],
  share_count integer NOT NULL DEFAULT 0,
  is_heavy boolean NOT NULL DEFAULT false,
  scan_id uuid NOT NULL REFERENCES public.brain_code_scans(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.brain_code_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brain_function_analysis ENABLE ROW LEVEL SECURITY;

-- RLS Policies for brain_code_scans
CREATE POLICY "Users can view their own scans"
ON public.brain_code_scans FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scans"
ON public.brain_code_scans FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scans"
ON public.brain_code_scans FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scans"
ON public.brain_code_scans FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for brain_function_analysis
CREATE POLICY "Users can view functions from their scans"
ON public.brain_function_analysis FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.brain_code_scans
    WHERE brain_code_scans.id = brain_function_analysis.scan_id
    AND brain_code_scans.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create function analysis for their scans"
ON public.brain_function_analysis FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.brain_code_scans
    WHERE brain_code_scans.id = brain_function_analysis.scan_id
    AND brain_code_scans.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update function analysis from their scans"
ON public.brain_function_analysis FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.brain_code_scans
    WHERE brain_code_scans.id = brain_function_analysis.scan_id
    AND brain_code_scans.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete function analysis from their scans"
ON public.brain_function_analysis FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.brain_code_scans
    WHERE brain_code_scans.id = brain_function_analysis.scan_id
    AND brain_code_scans.user_id = auth.uid()
  )
);

-- Create indexes for better performance
CREATE INDEX idx_brain_code_scans_user_id ON public.brain_code_scans(user_id);
CREATE INDEX idx_brain_code_scans_started_at ON public.brain_code_scans(started_at DESC);
CREATE INDEX idx_brain_function_analysis_scan_id ON public.brain_function_analysis(scan_id);
CREATE INDEX idx_brain_function_analysis_file_path ON public.brain_function_analysis(file_path);
CREATE INDEX idx_brain_function_analysis_is_duplicate ON public.brain_function_analysis(is_duplicate) WHERE is_duplicate = true;
CREATE INDEX idx_brain_function_analysis_is_shared ON public.brain_function_analysis(is_shared) WHERE is_shared = true;
CREATE INDEX idx_brain_function_analysis_is_heavy ON public.brain_function_analysis(is_heavy) WHERE is_heavy = true;