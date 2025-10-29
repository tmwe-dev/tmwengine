-- Fix security warning: imposta search_path immutabile
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
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT 
    cartella,
    COUNT(*) as count
  FROM public.email_messages
  WHERE user_email = p_user_email
    AND sync_status = p_sync_status
  GROUP BY cartella
  ORDER BY count DESC;
$$;