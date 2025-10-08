-- Modifica la policy INSERT su intranet_rooms per permettere creazione anche con user_id salvato
DROP POLICY IF EXISTS "Users can create rooms" ON public.intranet_rooms;

CREATE POLICY "Users can create rooms"
ON public.intranet_rooms
FOR INSERT
WITH CHECK (
  -- Permetti se auth.uid() corrisponde a created_by (sessione attiva)
  (auth.uid() IS NOT NULL AND auth.uid() = created_by)
  OR
  -- OPPURE permetti se created_by corrisponde a un utente esistente nel sistema
  (created_by IS NOT NULL AND EXISTS (
    SELECT 1 FROM auth.users WHERE id = created_by
  ))
);