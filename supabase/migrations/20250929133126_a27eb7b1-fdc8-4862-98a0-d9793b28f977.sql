-- Verifica i valori permessi per tipo_sync
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'email_sync_logs_tipo_sync_check';

-- Aggiorna il constraint per includere i nuovi valori di sincronizzazione
ALTER TABLE email_sync_logs DROP CONSTRAINT IF EXISTS email_sync_logs_tipo_sync_check;

ALTER TABLE email_sync_logs ADD CONSTRAINT email_sync_logs_tipo_sync_check 
CHECK (tipo_sync IN ('manuale', 'automatica', 'full_sync', 'incremental_sync', 'sync_folder', 'get_sync_status', 'cancel_sync'));