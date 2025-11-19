-- INCREMENTO 1: Aggiungere supporto prompt library a gruppi sender

-- 1. Aggiungi colonna prompt_library_id a email_sender_groups
ALTER TABLE email_sender_groups 
ADD COLUMN prompt_library_id UUID REFERENCES ai_prompt_library(id) ON DELETE SET NULL;

-- 2. Crea indice per performance
CREATE INDEX idx_email_sender_groups_prompt_library 
ON email_sender_groups(prompt_library_id) 
WHERE prompt_library_id IS NOT NULL;

-- 3. Commenta colonna per documentazione
COMMENT ON COLUMN email_sender_groups.prompt_library_id IS 
'Prompt AI template dal library da applicare automaticamente a nuovi sender nel gruppo. NULL = nessun prompt predefinito.';