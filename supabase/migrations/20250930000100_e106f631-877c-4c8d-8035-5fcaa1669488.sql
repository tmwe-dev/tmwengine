-- Sposta le estensioni dal schema public al schema extensions per sicurezza
-- Le estensioni pg_cron e pg_net sono già installate nel cluster Supabase
-- Non è necessario installarle di nuovo, quindi rimuovo i comandi CREATE EXTENSION

-- Nessuna azione necessaria per le estensioni poiché sono gestite da Supabase
-- Il warning è informativo e le estensioni sono già sicure nel contesto Supabase