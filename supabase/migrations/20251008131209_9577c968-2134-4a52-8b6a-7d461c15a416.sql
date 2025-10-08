-- Fix RLS policy for intranet_rooms to allow authenticated users to create rooms
-- without querying auth.users table

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can create rooms" ON public.intranet_rooms;

-- Create a simpler, correct policy
CREATE POLICY "Users can create rooms"
ON public.intranet_rooms
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
);