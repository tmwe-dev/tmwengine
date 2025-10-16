-- Tabella per i risultati dei benchmark TMWE API
CREATE TABLE IF NOT EXISTS public.tmwe_api_benchmark_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Metadati esecuzione
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  execution_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  category TEXT NOT NULL,
  total_suites INTEGER NOT NULL,
  total_tests INTEGER NOT NULL,
  
  -- Risultati aggregati
  results JSONB NOT NULL,
  
  -- Statistiche globali
  avg_response_time_ms INTEGER,
  overall_success_rate NUMERIC(5,2),
  total_duration_seconds INTEGER,
  
  -- Metadati ambiente
  browser_info TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX idx_benchmark_user_timestamp ON public.tmwe_api_benchmark_results(user_id, execution_timestamp DESC);
CREATE INDEX idx_benchmark_category ON public.tmwe_api_benchmark_results(category);

-- RLS Policies
ALTER TABLE public.tmwe_api_benchmark_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own benchmark results"
  ON public.tmwe_api_benchmark_results
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own benchmark results"
  ON public.tmwe_api_benchmark_results
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all benchmarks"
  ON public.tmwe_api_benchmark_results
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));