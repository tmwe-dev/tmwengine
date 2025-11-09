-- ════════════════════════════════════════════════════════════════════
-- SQL CLEANUP - Single Fast MAX Email Vuote (Archives)
-- ════════════════════════════════════════════════════════════════════
-- Creato: 2025-11-09
-- Scopo: Pulire email scaricate senza subject/from/date e resettare
--        email_temp_index per permettere ri-download completo
-- ════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────
-- STEP 1: Verifica email vuote (Archives senza subject)
-- ────────────────────────────────────────────────────────────────────
SELECT 
  COUNT(*) as email_vuote,
  cartella,
  user_email
FROM email_messages
WHERE user_email = 'luca@tmwe.it'
  AND cartella = 'Archives'
  AND (subject IS NULL OR subject = '')
GROUP BY cartella, user_email;

-- ────────────────────────────────────────────────────────────────────
-- STEP 2: Mostra esempio di email vuote (primi 5 record)
-- ────────────────────────────────────────────────────────────────────
SELECT 
  id,
  message_id,
  subject,
  from_email,
  data_invio,
  created_at
FROM email_messages
WHERE user_email = 'luca@tmwe.it'
  AND cartella = 'Archives'
  AND (subject IS NULL OR subject = '')
ORDER BY created_at DESC
LIMIT 5;

-- ────────────────────────────────────────────────────────────────────
-- STEP 3: Elimina email vuote da email_messages
-- ────────────────────────────────────────────────────────────────────
-- ⚠️ ATTENZIONE: Questa query elimina definitivamente i record vuoti
DELETE FROM email_messages
WHERE user_email = 'luca@tmwe.it'
  AND cartella = 'Archives'
  AND (subject IS NULL OR subject = '');

-- ────────────────────────────────────────────────────────────────────
-- STEP 4: Resetta email_temp_index per riscarico completo
-- ────────────────────────────────────────────────────────────────────
-- Questo permette a Single Fast MAX di riscarcare le email complete
DELETE FROM email_temp_index
WHERE user_email = 'luca@tmwe.it'
  AND folder = 'Archives'
  AND status = 'imported';

-- ────────────────────────────────────────────────────────────────────
-- STEP 5: Verifica pulizia completata
-- ────────────────────────────────────────────────────────────────────
SELECT 
  cartella,
  COUNT(*) as total_emails,
  COUNT(CASE WHEN subject IS NOT NULL AND subject != '' THEN 1 END) as emails_con_subject,
  COUNT(CASE WHEN subject IS NULL OR subject = '' THEN 1 END) as emails_vuote
FROM email_messages 
WHERE user_email = 'luca@tmwe.it' 
  AND cartella = 'Archives'
GROUP BY cartella;

-- ────────────────────────────────────────────────────────────────────
-- STEP 6: Verifica stato email_temp_index
-- ────────────────────────────────────────────────────────────────────
SELECT 
  folder,
  status,
  COUNT(*) as count
FROM email_temp_index
WHERE user_email = 'luca@tmwe.it'
  AND folder = 'Archives'
GROUP BY folder, status
ORDER BY status;

-- ════════════════════════════════════════════════════════════════════
-- RISULTATO ATTESO:
-- ════════════════════════════════════════════════════════════════════
-- - email_messages: 0 email vuote per Archives
-- - email_temp_index: status 'imported' azzerato per Archives
-- - Prossimo download Single Fast MAX scaricherà dati completi
-- ════════════════════════════════════════════════════════════════════
