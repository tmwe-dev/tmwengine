-- Pulizia email duplicate nel database
-- Mantiene solo la prima email per ogni combinazione di cartella + subject + from_email + data_ricezione

WITH duplicates AS (
  SELECT id, 
         ROW_NUMBER() OVER (
           PARTITION BY cartella, subject, from_email, data_ricezione 
           ORDER BY created_at ASC
         ) as rn
  FROM email_messages
  WHERE cartella = 'Archives'
)
DELETE FROM email_messages
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);