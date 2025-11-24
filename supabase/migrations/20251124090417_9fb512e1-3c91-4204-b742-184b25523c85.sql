-- 🧹 STEP 1: Cancellare suggerimenti vecchi (pre anti-specificità)
-- Rimuove tutti i suggerimenti pending per permettere rigenerazione con nuove regole

DELETE FROM email_sender_grouping_suggestions 
WHERE status = 'pending';