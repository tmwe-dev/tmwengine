-- Fix RLS policies for intranet_room_ai_prompts to allow all operations during development
DROP POLICY IF EXISTS "Room creators and admins can manage room AI settings" ON intranet_room_ai_prompts;
DROP POLICY IF EXISTS "Room creators and admins can view room AI settings" ON intranet_room_ai_prompts;

-- Allow all operations during development
CREATE POLICY "Allow all operations on intranet_room_ai_prompts"
ON intranet_room_ai_prompts
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);