-- FASE 3: Call Analytics & Monitoring

-- Tabella per logging chiamate audio/video
CREATE TABLE IF NOT EXISTS public.call_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_type TEXT NOT NULL CHECK (call_type IN ('audio', 'video')),
  caller_id UUID NOT NULL,
  callee_id UUID NOT NULL,
  room_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('initiated', 'ringing', 'connected', 'ended', 'failed', 'rejected')),
  connection_time_ms INTEGER,
  duration_seconds INTEGER,
  error_message TEXT,
  ice_candidates_count INTEGER,
  video_quality TEXT CHECK (video_quality IN ('low', 'medium', 'high', 'auto')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own calls
CREATE POLICY "Users can view their own call logs"
ON public.call_logs
FOR SELECT
USING (
  auth.uid() = caller_id OR auth.uid() = callee_id
);

-- Policy: System can insert call logs
CREATE POLICY "Authenticated users can insert call logs"
ON public.call_logs
FOR INSERT
WITH CHECK (
  auth.uid() = caller_id OR auth.uid() = callee_id
);

-- Policy: Users can update their own calls
CREATE POLICY "Users can update their own call logs"
ON public.call_logs
FOR UPDATE
USING (
  auth.uid() = caller_id OR auth.uid() = callee_id
);

-- Index per performance
CREATE INDEX idx_call_logs_caller ON public.call_logs(caller_id);
CREATE INDEX idx_call_logs_callee ON public.call_logs(callee_id);
CREATE INDEX idx_call_logs_created_at ON public.call_logs(created_at DESC);
CREATE INDEX idx_call_logs_status ON public.call_logs(status);

-- Trigger per updated_at
CREATE TRIGGER update_call_logs_updated_at
BEFORE UPDATE ON public.call_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();