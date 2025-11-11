-- Modifica constraint UNIQUE per permettere gruppi con stesso nome ma user_id diverso
-- Questo consente multi-tenancy: ogni utente può avere gruppi "Newsletter", "Clienti", etc.

-- 1. Rimuovi constraint vecchio (globale)
ALTER TABLE email_sender_groups 
DROP CONSTRAINT IF EXISTS email_sender_groups_nome_gruppo_key;

-- 2. Aggiungi nuovo constraint (per-utente)
ALTER TABLE email_sender_groups 
ADD CONSTRAINT email_sender_groups_user_nome_key 
UNIQUE (user_id, nome_gruppo);

-- Risultato: 
-- ✅ User A può avere gruppo "Newsletter"
-- ✅ User B può avere gruppo "Newsletter" (diverso user_id)
-- ❌ Stesso utente NON può creare 2 gruppi con stesso nome