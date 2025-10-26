-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Users can view their own agents" ON elevenlabs_agents;

-- Create new public policy: all authenticated users can view active agents
CREATE POLICY "Anyone can view active agents" 
ON elevenlabs_agents 
FOR SELECT 
USING (is_active = true);

-- Keep existing policies for INSERT/UPDATE/DELETE unchanged
-- (they still require user_id = auth.uid() for user's own agents)