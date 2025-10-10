-- STEP 1: Eliminare tutte le email di jose.gabriel@tmwe.it
DELETE FROM email_messages 
WHERE user_email = 'jose.gabriel@tmwe.it';

-- STEP 4: Creare funzione per admin - conteggio email per utente
CREATE OR REPLACE FUNCTION get_users_email_counts()
RETURNS TABLE (
  email TEXT,
  count BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    user_email as email,
    COUNT(*) as count
  FROM email_messages
  GROUP BY user_email
  ORDER BY count DESC;
$$;