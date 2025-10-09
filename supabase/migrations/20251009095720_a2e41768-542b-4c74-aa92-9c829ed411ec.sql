-- Add is_system_message field to intranet_messages table
ALTER TABLE intranet_messages 
ADD COLUMN is_system_message boolean DEFAULT false;

-- Create index for better query performance on system messages
CREATE INDEX idx_intranet_messages_system ON intranet_messages(is_system_message) 
WHERE is_system_message = true;

-- Update RLS policy to allow null user_id for system messages
DROP POLICY IF EXISTS "Users can send messages to their rooms" ON intranet_messages;

CREATE POLICY "Users can send messages to their rooms"
ON intranet_messages
FOR INSERT
WITH CHECK (
  auth.uid() = user_id OR 
  (user_id IS NULL AND is_system_message = true)
);