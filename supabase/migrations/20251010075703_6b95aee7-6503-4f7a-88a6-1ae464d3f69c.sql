-- Create email sync preferences table
CREATE TABLE IF NOT EXISTS public.email_sync_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  excluded_folders JSONB DEFAULT '["Trash", "Archives", "Junk", "Drafts"]'::jsonb,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_email)
);

-- Enable RLS
ALTER TABLE public.email_sync_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "Users can view own sync preferences"
ON public.email_sync_preferences
FOR SELECT
USING (
  user_email IN (
    SELECT tmwe_email 
    FROM public.user_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Users can insert their own preferences
CREATE POLICY "Users can insert own sync preferences"
ON public.email_sync_preferences
FOR INSERT
WITH CHECK (
  user_email IN (
    SELECT tmwe_email 
    FROM public.user_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Users can update their own preferences
CREATE POLICY "Users can update own sync preferences"
ON public.email_sync_preferences
FOR UPDATE
USING (
  user_email IN (
    SELECT tmwe_email 
    FROM public.user_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_email_sync_preferences_updated_at
BEFORE UPDATE ON public.email_sync_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();