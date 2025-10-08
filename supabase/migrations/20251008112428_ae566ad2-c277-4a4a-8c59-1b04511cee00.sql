-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view room members for their rooms" ON public.intranet_room_members;
DROP POLICY IF EXISTS "Users can view rooms they are members of" ON public.intranet_rooms;
DROP POLICY IF EXISTS "Room creators can add members" ON public.intranet_room_members;
DROP POLICY IF EXISTS "Users can join rooms" ON public.intranet_room_members;

-- Create security definer function to check room membership
CREATE OR REPLACE FUNCTION public.is_room_member(_room_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.intranet_room_members
    WHERE room_id = _room_id
      AND user_id = _user_id
  )
$$;

-- Create new policies using the security definer function
CREATE POLICY "Users can view rooms they are members of"
ON public.intranet_rooms
FOR SELECT
USING (public.is_room_member(id, auth.uid()));

CREATE POLICY "Users can view room members for their rooms"
ON public.intranet_room_members
FOR SELECT
USING (public.is_room_member(room_id, auth.uid()));

CREATE POLICY "Room creators can add members"
ON public.intranet_room_members
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.intranet_rooms
    WHERE intranet_rooms.id = room_id
      AND intranet_rooms.created_by = auth.uid()
  )
);

CREATE POLICY "Users can join rooms"
ON public.intranet_room_members
FOR INSERT
WITH CHECK (auth.uid() = user_id);