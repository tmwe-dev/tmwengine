-- =====================================================
-- AI COLLABORATION SYSTEM - FASE 2
-- Database Schema per Task Queue e Storage
-- =====================================================

-- Tabella per tracking task proposti da AI esterni
CREATE TABLE IF NOT EXISTS public.ai_collaboration_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Dati task
  title TEXT NOT NULL,
  file TEXT,
  problem TEXT NOT NULL,
  solution TEXT,
  priority TEXT NOT NULL CHECK (priority IN ('alta', 'media', 'bassa')),
  
  -- Metadata
  proposed_by TEXT NOT NULL, -- 'ChatGPT' | 'Claude' | 'Gemini'
  proposed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'in_progress', 'completed', 'rejected')),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  completed_by TEXT, -- 'Lovable' | 'Manual'
  
  -- Dati implementazione
  implementation_notes TEXT,
  files_modified TEXT[], -- Array di file path modificati
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index per performance
CREATE INDEX IF NOT EXISTS idx_ai_tasks_status ON public.ai_collaboration_tasks(status);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_priority ON public.ai_collaboration_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_proposed_at ON public.ai_collaboration_tasks(proposed_at DESC);

-- RLS Policies
ALTER TABLE public.ai_collaboration_tasks ENABLE ROW LEVEL SECURITY;

-- Tutti gli utenti autenticati possono leggere task
DROP POLICY IF EXISTS "Authenticated users can view tasks" ON public.ai_collaboration_tasks;
CREATE POLICY "Authenticated users can view tasks"
ON public.ai_collaboration_tasks
FOR SELECT
USING (auth.role() = 'authenticated');

-- Service role può inserire task (via edge functions)
DROP POLICY IF EXISTS "Service role can insert tasks" ON public.ai_collaboration_tasks;
CREATE POLICY "Service role can insert tasks"
ON public.ai_collaboration_tasks
FOR INSERT
WITH CHECK (true);

-- Utenti autenticati possono aggiornare task (approvazione/completamento)
DROP POLICY IF EXISTS "Authenticated users can update tasks" ON public.ai_collaboration_tasks;
CREATE POLICY "Authenticated users can update tasks"
ON public.ai_collaboration_tasks
FOR UPDATE
USING (auth.role() = 'authenticated');

-- Trigger per updated_at
DROP TRIGGER IF EXISTS update_ai_tasks_updated_at ON public.ai_collaboration_tasks;
CREATE TRIGGER update_ai_tasks_updated_at
BEFORE UPDATE ON public.ai_collaboration_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Commento tabella
COMMENT ON TABLE public.ai_collaboration_tasks IS 'Task proposti da AI esterni (ChatGPT, Claude, Gemini) per miglioramenti/fix codice';

-- =====================================================
-- STORAGE BUCKET per documenti AI
-- =====================================================

-- Bucket privato per backup documenti AI
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ai-collaboration-docs',
  'ai-collaboration-docs',
  false, -- PRIVATO
  5242880, -- 5MB limit
  ARRAY['text/markdown', 'application/json', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Utenti autenticati possono leggere
DROP POLICY IF EXISTS "Authenticated users can read AI docs" ON storage.objects;
CREATE POLICY "Authenticated users can read AI docs"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'ai-collaboration-docs' AND
  auth.role() = 'authenticated'
);

-- RLS Policy: Service Role può scrivere (via edge functions)
DROP POLICY IF EXISTS "Service role can write AI docs" ON storage.objects;
CREATE POLICY "Service role can write AI docs"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'ai-collaboration-docs');

DROP POLICY IF EXISTS "Service role can update AI docs" ON storage.objects;
CREATE POLICY "Service role can update AI docs"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'ai-collaboration-docs');