-- Rimuovi la policy esistente
DROP POLICY IF EXISTS "Allow all operations on config_ai" ON public.config_ai;

-- Crea una nuova policy che permette tutte le operazioni senza restrizioni
CREATE POLICY "Allow all operations on config_ai" 
ON public.config_ai 
FOR ALL 
USING (true) 
WITH CHECK (true);