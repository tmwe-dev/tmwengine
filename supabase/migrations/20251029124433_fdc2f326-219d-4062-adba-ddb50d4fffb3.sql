-- Crea funzione RPC per aggregare conteggio email per cartella
-- Necessaria per evitare limite 1000 record nelle query client-side
CREATE OR REPLACE FUNCTION get_email_folder_counts(
  p_user_email text,
  p_sync_status text
)
RETURNS TABLE (
  cartella text,
  count bigint
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    cartella,
    COUNT(*) as count
  FROM email_messages
  WHERE user_email = p_user_email
    AND sync_status = p_sync_status
  GROUP BY cartella
  ORDER BY count DESC;
$$;