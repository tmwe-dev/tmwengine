-- =====================================================
-- PERFORMANCE PROFILES TABLE
-- Sistema di profili di performance per operazioni email TMWE
-- Data: 2025-11-03
-- =====================================================

-- Tabella per i profili di performance delle operazioni email
CREATE TABLE IF NOT EXISTS public.performance_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificazione
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  profile_name TEXT NOT NULL,
  description TEXT,
  
  -- Configurazione ottimizzazione (basata su OptimizationFlags)
  optimization_flags JSONB NOT NULL DEFAULT '{
    "useLogging": true,
    "useJsonSerialization": true,
    "useOptimizedExecution": true,
    "useResponseProcessing": true,
    "useBatchParallelization": true,
    "batchChunkSize": 10,
    "benchmarkDelay": 0
  }'::jsonb,
  
  -- Metriche di performance (dal benchmark)
  avg_response_time_ms INTEGER,
  success_rate DECIMAL(5,2),
  total_tests_run INTEGER DEFAULT 0,
  
  -- Metadati sorgente
  source_benchmark_id UUID REFERENCES public.tmwe_api_benchmark_results(id) ON DELETE SET NULL,
  source_test_name TEXT,
  
  -- Stato e utilizzo
  is_active BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Constraint: un solo profilo attivo per utente
CREATE UNIQUE INDEX unique_active_profile_per_user 
  ON public.performance_profiles(user_id) 
  WHERE (is_active = true);

-- Indici per performance
CREATE INDEX idx_performance_profiles_user_active 
  ON public.performance_profiles(user_id, is_active DESC);
  
CREATE INDEX idx_performance_profiles_source_benchmark 
  ON public.performance_profiles(source_benchmark_id);

-- Trigger per updated_at
CREATE TRIGGER update_performance_profiles_updated_at 
  BEFORE UPDATE ON public.performance_profiles 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE public.performance_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profiles"
  ON public.performance_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profiles"
  ON public.performance_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profiles"
  ON public.performance_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own profiles"
  ON public.performance_profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON public.performance_profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- =====================================================
-- COMMENTI
-- =====================================================

COMMENT ON TABLE public.performance_profiles IS 
  'Profili di performance salvati dai test di ottimizzazione TMWE API';
  
COMMENT ON COLUMN public.performance_profiles.optimization_flags IS 
  'Flags di ottimizzazione JSON corrispondenti a OptimizationFlags interface';
  
COMMENT ON COLUMN public.performance_profiles.is_active IS 
  'Solo un profilo può essere attivo per utente (enforced by unique index)';