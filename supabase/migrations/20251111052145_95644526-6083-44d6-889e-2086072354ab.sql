-- FASE 3 & 4: Eliminazione gruppi AI troppo specifici
-- Backup automatico via Supabase migrations

-- Eliminare gruppi AI creati il 2025-11-10 che sono troppo specifici
-- Manteniamo solo: Recruiting, Fornitori, Logistica, Partner Commerciale, Fatturazione, Eventi e Fiere
DELETE FROM email_sender_groups
WHERE descrizione IS NULL 
  AND icon = '📧' 
  AND colore = '#3B82F6'
  AND created_at >= '2025-11-10'
  AND nome_gruppo NOT IN (
    'Recruiting', 'Fornitori', 'Logistica', 
    'Partner Commerciale', 'Fatturazione', 'Eventi e Fiere'
  );

-- Log operazione in project_history
INSERT INTO project_history (
  operation,
  tables_modified,
  metadata
) VALUES (
  'delete_ai_specific_groups',
  ARRAY['email_sender_groups'],
  jsonb_build_object(
    'gruppi_eliminati_circa', 28,
    'data_operazione', NOW(),
    'motivo', 'Eliminati gruppi AI troppo specifici creati il 2025-11-10. Mantenuti solo 6 gruppi AI generici utili + 25 gruppi utente = 31 gruppi totali.',
    'gruppi_ai_mantenuti', ARRAY['Recruiting', 'Fornitori', 'Logistica', 'Partner Commerciale', 'Fatturazione', 'Eventi e Fiere']
  )
);