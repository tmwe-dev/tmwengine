-- FASE 1: Backup e pulizia suggerimenti vecchi (generati con prompt sbagliato)

-- Backup suggerimenti esistenti prima di eliminare
CREATE TABLE IF NOT EXISTS email_sender_grouping_suggestions_backup_20250107 AS 
SELECT * FROM email_sender_grouping_suggestions;

-- Commento per documentare il backup
COMMENT ON TABLE email_sender_grouping_suggestions_backup_20250107 IS 
'Backup suggerimenti prima correzione prompt (2025-01-07). Sistema vecchio analizzava CONTENUTO email invece di TIPO MITTENTE. Suggerimenti non validi eliminati per rigenerazione con prompt corretto.';

-- Elimina suggerimenti generati con prompt vecchio (pending e dismissed)
DELETE FROM email_sender_grouping_suggestions 
WHERE status IN ('pending', 'dismissed');

-- Log operazione completata
DO $$
BEGIN
  RAISE NOTICE '✅ FASE 1 completata: % suggerimenti vecchi eliminati', 
    (SELECT COUNT(*) FROM email_sender_grouping_suggestions_backup_20250107 WHERE status IN ('pending', 'dismissed'));
END $$;