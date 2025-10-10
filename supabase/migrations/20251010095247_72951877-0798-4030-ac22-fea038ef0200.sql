-- Aggiungi colonne mancanti a email_sync_preferences
ALTER TABLE public.email_sync_preferences 
ADD COLUMN IF NOT EXISTS date_filter_months INTEGER DEFAULT 24,
ADD COLUMN IF NOT EXISTS default_sync_mode TEXT DEFAULT 'smart',
ADD COLUMN IF NOT EXISTS included_folders JSONB DEFAULT '[]'::jsonb;