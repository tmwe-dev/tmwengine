-- Modifica funzione esistente get_email_folder_counts per rendere p_sync_status opzionale
-- Se p_sync_status è NULL, conta TUTTE le email (per EmailIntegrityChecker)
-- Se p_sync_status è specificato, filtra per quel sync_status (per FunEmailQuickStats)

CREATE OR REPLACE FUNCTION public.get_email_folder_counts(p_user_email text, p_sync_status text DEFAULT NULL)
RETURNS TABLE(cartella text, count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    cartella,
    COUNT(*) as count
  FROM email_messages
  WHERE user_email = p_user_email
    AND (p_sync_status IS NULL OR sync_status = p_sync_status)
  GROUP BY cartella
  ORDER BY count DESC;
$$;