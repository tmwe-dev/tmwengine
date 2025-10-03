-- Rimuovi le policy restrittive su config_ai
DROP POLICY IF EXISTS "Admins can view AI config" ON public.config_ai;
DROP POLICY IF EXISTS "Admins can insert AI config" ON public.config_ai;
DROP POLICY IF EXISTS "Admins can update AI config" ON public.config_ai;
DROP POLICY IF EXISTS "Admins can delete AI config" ON public.config_ai;

-- Crea una policy permissiva per tutti gli utenti autenticati
CREATE POLICY "Allow all operations on config_ai"
ON public.config_ai
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);