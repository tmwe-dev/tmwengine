-- Abilita realtime per email_sync_progress
ALTER TABLE public.email_sync_progress REPLICA IDENTITY FULL;

-- Aggiungi la tabella alla pubblicazione realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_sync_progress;