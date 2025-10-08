-- Drop old permissive policies
DROP POLICY IF EXISTS "Allow all on intranet_rooms during development" ON public.intranet_rooms;
DROP POLICY IF EXISTS "Allow all on intranet_room_members during development" ON public.intranet_room_members;

-- ====================================
-- INTRANET_ROOMS POLICIES
-- ====================================

-- Users can view rooms they are members of
CREATE POLICY "Users can view rooms they are members of"
ON public.intranet_rooms
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.intranet_room_members
    WHERE room_id = intranet_rooms.id
    AND user_id = auth.uid()
  )
);

-- Users can create rooms
CREATE POLICY "Users can create rooms"
ON public.intranet_rooms
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);

-- Users can update their own rooms
CREATE POLICY "Users can update their own rooms"
ON public.intranet_rooms
FOR UPDATE
USING (auth.uid() = created_by);

-- Admins can manage all rooms
CREATE POLICY "Admins can manage all rooms"
ON public.intranet_rooms
FOR ALL
USING (public.is_admin(auth.uid()));

-- ====================================
-- INTRANET_ROOM_MEMBERS POLICIES
-- ====================================

-- Users can view room members for their rooms
CREATE POLICY "Users can view room members for their rooms"
ON public.intranet_room_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.intranet_room_members AS m
    WHERE m.room_id = intranet_room_members.room_id
    AND m.user_id = auth.uid()
  )
);

-- Users can join rooms (add themselves)
CREATE POLICY "Users can join rooms"
ON public.intranet_room_members
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Room creators can add members to their rooms
CREATE POLICY "Room creators can add members"
ON public.intranet_room_members
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.intranet_rooms
    WHERE id = intranet_room_members.room_id
    AND created_by = auth.uid()
  )
);

-- Admins can manage all room members
CREATE POLICY "Admins can manage room members"
ON public.intranet_room_members
FOR ALL
USING (public.is_admin(auth.uid()));