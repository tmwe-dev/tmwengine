-- FIX: Aggiunge SET search_path alla funzione TURBO V2 per sicurezza
DROP FUNCTION IF EXISTS bulk_insert_emails_turbo_v2(JSONB);

CREATE OR REPLACE FUNCTION bulk_insert_emails_turbo_v2(p_records JSONB)
RETURNS TABLE(
  inserted_count INTEGER,
  skipped_count INTEGER,
  execution_time_ms INTEGER
) AS $$
DECLARE
  start_time TIMESTAMP;
  inserted INTEGER;
  skipped INTEGER;
BEGIN
  start_time := clock_timestamp();
  
  -- Bulk insert atomico con ON CONFLICT DO NOTHING
  INSERT INTO email_messages (
    message_id,
    user_email,
    from_email,
    to_email,
    cc_email,
    bcc_email,
    subject,
    body_text,
    body_html,
    data_ricezione,
    cartella,
    attachments,
    flags,
    direzione,
    provider_id,
    stato,
    sync_status
  )
  SELECT 
    r->>'message_id',
    r->>'user_email',
    r->>'from_email',
    r->>'to_email',
    r->>'cc_email',
    r->>'bcc_email',
    r->>'subject',
    r->>'body_text',
    r->>'body_html',
    (r->>'data_ricezione')::timestamptz,
    r->>'cartella',
    COALESCE((r->>'attachments')::jsonb, '[]'::jsonb),
    COALESCE((r->>'flags')::jsonb, '[]'::jsonb),
    COALESCE(r->>'direzione', 'inbound'),
    COALESCE((r->>'provider_id')::uuid, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(r->>'stato', 'nuovo'),
    COALESCE(r->>'sync_status', 'fun_email_backup')
  FROM jsonb_array_elements(p_records) r
  ON CONFLICT (message_id) DO NOTHING;
  
  GET DIAGNOSTICS inserted = ROW_COUNT;
  skipped := jsonb_array_length(p_records) - inserted;
  
  RETURN QUERY SELECT 
    inserted, 
    skipped, 
    EXTRACT(MILLISECONDS FROM (clock_timestamp() - start_time))::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

COMMENT ON FUNCTION bulk_insert_emails_turbo_v2 IS 
'TURBO V2: Bulk insert ottimizzato con metriche performance. 
Ritorna: (inserted_count, skipped_count, execution_time_ms).';
