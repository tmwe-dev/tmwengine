-- Indice composito critico per analyze_senders_aggregated()
-- Permette query istantanee su user_email + sync_status + GROUP BY from_email
CREATE INDEX IF NOT EXISTS idx_email_sender_analysis_optimized 
ON email_messages(user_email, sync_status, from_email, data_ricezione) 
WHERE sync_status = 'fun_email_backup';

-- Aggiorna statistiche tabella per query planner ottimale
ANALYZE email_messages;