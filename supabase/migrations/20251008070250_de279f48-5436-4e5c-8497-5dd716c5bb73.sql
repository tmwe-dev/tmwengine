-- Rimuovi tutte le policy esistenti su intranet_rooms e intranet_room_members
DROP POLICY IF EXISTS "Authenticated users can create rooms" ON public.intranet_rooms;
DROP POLICY IF EXISTS "Room creators can update their rooms" ON public.intranet_rooms;
DROP POLICY IF EXISTS "Users can view rooms they are members of" ON public.intranet_rooms;
DROP POLICY IF EXISTS "Room creators can add members" ON public.intranet_room_members;
DROP POLICY IF EXISTS "Users can view members of their rooms" ON public.intranet_room_members;

-- Crea policy permissive per sviluppo su intranet_rooms
CREATE POLICY "Allow all on intranet_rooms during development"
ON public.intranet_rooms
FOR ALL
USING (true)
WITH CHECK (true);

-- Crea policy permissive per sviluppo su intranet_room_members
CREATE POLICY "Allow all on intranet_room_members during development"
ON public.intranet_room_members
FOR ALL
USING (true)
WITH CHECK (true);