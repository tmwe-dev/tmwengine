
-- Create email_sync_jobs table for server-side sync job tracking
CREATE TABLE public.email_sync_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'paused', 'completed', 'error')),
  folders TEXT[] NOT NULL DEFAULT '{}',
  current_folder TEXT,
  total_to_download INTEGER NOT NULL DEFAULT 0,
  downloaded_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_sync_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own sync jobs"
  ON public.email_sync_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sync jobs"
  ON public.email_sync_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sync jobs"
  ON public.email_sync_jobs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sync jobs"
  ON public.email_sync_jobs FOR DELETE
  USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_sync_jobs;

-- Trigger for updated_at
CREATE TRIGGER update_email_sync_jobs_updated_at
  BEFORE UPDATE ON public.email_sync_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
