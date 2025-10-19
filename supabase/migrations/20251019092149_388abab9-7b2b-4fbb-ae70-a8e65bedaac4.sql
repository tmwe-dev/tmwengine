-- Abilita Row Level Security sulla tabella config_ai
-- Risolve il problema di accesso alle impostazioni CRM AI Classification
ALTER TABLE public.config_ai ENABLE ROW LEVEL SECURITY;

-- La policy esistente "Allow all operations on config_ai" rimane attiva
-- e permetterà l'accesso a tutti gli utenti autenticati