-- Funzione RPC per aggregare mittenti lato database
-- Evita download di tutte le email, restituisce solo statistiche aggregate
CREATE OR REPLACE FUNCTION analyze_senders_aggregated(p_user_email TEXT)
RETURNS TABLE (
  from_email TEXT,
  email_count BIGINT,
  first_seen TIMESTAMP WITH TIME ZONE,
  last_seen TIMESTAMP WITH TIME ZONE,
  has_attachments BOOLEAN
) 
LANGUAGE plpgsql 
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    em.from_email::TEXT,
    COUNT(*)::BIGINT as email_count,
    MIN(em.data_ricezione) as first_seen,
    MAX(em.data_ricezione) as last_seen,
    BOOL_OR(
      em.attachments IS NOT NULL 
      AND jsonb_array_length(em.attachments) > 0
    ) as has_attachments
  FROM email_messages em
  WHERE em.user_email = p_user_email
    AND em.sync_status = 'fun_email_backup'
    AND em.from_email IS NOT NULL
    AND em.from_email LIKE '%@%'
  GROUP BY em.from_email
  ORDER BY email_count DESC;
END;
$$;