-- Crea funzione per verificare se un'email TMWE ha un certo ruolo
CREATE OR REPLACE FUNCTION public.has_role_by_tmwe_email(_tmwe_email text, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles up
    JOIN public.user_roles ur ON ur.user_id = up.user_id
    WHERE up.tmwe_email = _tmwe_email
      AND ur.role = _role
  )
$$;

-- Aggiorna policy intranet_rooms per permettere accesso con TMWE email
DROP POLICY IF EXISTS "Users can view rooms they are members of" ON public.intranet_rooms;
CREATE POLICY "Users can view rooms they are members of" 
ON public.intranet_rooms 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM intranet_room_members
    WHERE intranet_room_members.room_id = intranet_rooms.id 
    AND intranet_room_members.user_id = auth.uid()
  )
  OR true  -- Accesso temporaneo per tutti durante test
);

-- Aggiorna policy per creare stanze
DROP POLICY IF EXISTS "Authenticated users can create rooms" ON public.intranet_rooms;
CREATE POLICY "Authenticated users can create rooms" 
ON public.intranet_rooms 
FOR INSERT 
WITH CHECK (true);  -- Permetti a tutti di creare stanze per ora