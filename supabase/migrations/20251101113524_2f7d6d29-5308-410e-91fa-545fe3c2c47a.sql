-- Pulizia classificazioni obsolete senza email_id valido
DELETE FROM email_ai_classifications
WHERE email_id IS NULL;