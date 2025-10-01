-- Elimina i record duplicati di credenziali, mantenendo solo l'ultimo con token valido
-- Step 1: Crea una tabella temporanea con solo i record da mantenere (ultimo per ogni provider_id con token)
WITH ranked_credentials AS (
  SELECT 
    id,
    provider_id,
    api_key,
    oauth_token,
    ROW_NUMBER() OVER (
      PARTITION BY provider_id 
      ORDER BY 
        CASE 
          WHEN oauth_token IS NOT NULL AND oauth_token != '' THEN 1
          WHEN api_key IS NOT NULL AND api_key != '' THEN 2
          ELSE 3
        END,
        created_at DESC
    ) as rn
  FROM email_provider_credenziali
)
-- Step 2: Elimina tutti i record tranne quello con rn = 1 (il migliore per ogni provider)
DELETE FROM email_provider_credenziali
WHERE id IN (
  SELECT id 
  FROM ranked_credentials 
  WHERE rn > 1
);

-- Step 3: Aggiungi constraint UNIQUE su provider_id per prevenire futuri duplicati
ALTER TABLE email_provider_credenziali 
ADD CONSTRAINT email_provider_credenziali_provider_id_unique 
UNIQUE (provider_id);