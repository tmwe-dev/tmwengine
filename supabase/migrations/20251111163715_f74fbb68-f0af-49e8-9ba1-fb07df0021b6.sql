-- ============================================
-- MIGRATION: Rendi elevenlabs_agents globale
-- MOTIVO: Tutti gli utenti devono vedere le stesse configurazioni (famiglia condivisa)
-- ============================================

-- 1️⃣ DROP policy per-utente esistenti
DROP POLICY IF EXISTS "Users can insert their own agents" ON public.elevenlabs_agents;
DROP POLICY IF EXISTS "Users can update their own agents" ON public.elevenlabs_agents;
DROP POLICY IF EXISTS "Users can delete their own agents" ON public.elevenlabs_agents;
DROP POLICY IF EXISTS "Anyone can view active agents" ON public.elevenlabs_agents;

-- 2️⃣ CREATE policy globale (accesso totale come config_ai)
CREATE POLICY "Allow all operations on elevenlabs_agents"
ON public.elevenlabs_agents
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- 3️⃣ COMMENT per documentazione
COMMENT ON POLICY "Allow all operations on elevenlabs_agents" ON public.elevenlabs_agents IS 
'Accesso globale: tutti gli utenti vedono e gestiscono gli stessi agenti (configurazione famiglia condivisa)';