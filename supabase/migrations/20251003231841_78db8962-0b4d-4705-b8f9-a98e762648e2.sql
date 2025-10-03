-- Update get_tables_with_counts to include email_sender_groups and email_sender_rules
CREATE OR REPLACE FUNCTION public.get_tables_with_counts()
 RETURNS TABLE(table_name text, row_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    t.table_name::text,
    CASE 
      WHEN t.table_name = 'attivita' THEN (SELECT COUNT(*) FROM attivita)
      WHEN t.table_name = 'chat_conversations' THEN (SELECT COUNT(*) FROM chat_conversations)
      WHEN t.table_name = 'chat_messages' THEN (SELECT COUNT(*) FROM chat_messages)
      WHEN t.table_name = 'chat_system_prompts' THEN (SELECT COUNT(*) FROM chat_system_prompts)
      WHEN t.table_name = 'chat_usage_stats' THEN (SELECT COUNT(*) FROM chat_usage_stats)
      WHEN t.table_name = 'config_ai' THEN (SELECT COUNT(*) FROM config_ai)
      WHEN t.table_name = 'config_generale' THEN (SELECT COUNT(*) FROM config_generale)
      WHEN t.table_name = 'email_attachments' THEN (SELECT COUNT(*) FROM email_attachments)
      WHEN t.table_name = 'email_messages' THEN (SELECT COUNT(*) FROM email_messages)
      WHEN t.table_name = 'email_provider' THEN (SELECT COUNT(*) FROM email_provider)
      WHEN t.table_name = 'email_provider_credenziali' THEN (SELECT COUNT(*) FROM email_provider_credenziali)
      WHEN t.table_name = 'email_sender_groups' THEN (SELECT COUNT(*) FROM email_sender_groups)
      WHEN t.table_name = 'email_sender_rules' THEN (SELECT COUNT(*) FROM email_sender_rules)
      WHEN t.table_name = 'email_ssl_config' THEN (SELECT COUNT(*) FROM email_ssl_config)
      WHEN t.table_name = 'email_sync_logs' THEN (SELECT COUNT(*) FROM email_sync_logs)
      WHEN t.table_name = 'email_sync_progress' THEN (SELECT COUNT(*) FROM email_sync_progress)
      WHEN t.table_name = 'email_templates' THEN (SELECT COUNT(*) FROM email_templates)
      WHEN t.table_name = 'file_imports' THEN (SELECT COUNT(*) FROM file_imports)
      WHEN t.table_name = 'import_logs' THEN (SELECT COUNT(*) FROM import_logs)
      WHEN t.table_name = 'imported_contacts' THEN (SELECT COUNT(*) FROM imported_contacts)
      WHEN t.table_name = 'rubrica' THEN (SELECT COUNT(*) FROM rubrica)
      WHEN t.table_name = 'user_roles' THEN (SELECT COUNT(*) FROM user_roles)
      WHEN t.table_name = 'user_tmwe_credentials' THEN (SELECT COUNT(*) FROM user_tmwe_credentials)
      WHEN t.table_name = 'ui_style_configs' THEN (SELECT COUNT(*) FROM ui_style_configs)
      WHEN t.table_name = 'temp_ai_import' THEN (SELECT COUNT(*) FROM temp_ai_import)
      WHEN t.table_name = 'temp_ai_reviewed' THEN (SELECT COUNT(*) FROM temp_ai_reviewed)
      ELSE 0
    END as row_count
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
  ORDER BY t.table_name;
END;
$function$;