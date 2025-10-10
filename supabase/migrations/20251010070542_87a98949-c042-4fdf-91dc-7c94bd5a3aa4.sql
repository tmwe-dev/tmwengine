-- Fix RLS policy per email_messages: usa user_profiles invece di auth.users

-- Drop old policies
DROP POLICY IF EXISTS "Users can view own emails v2" ON email_messages;
DROP POLICY IF EXISTS "Users can insert own emails v2" ON email_messages;
DROP POLICY IF EXISTS "Users can update own emails v2" ON email_messages;
DROP POLICY IF EXISTS "Users can delete own emails v2" ON email_messages;

-- Create new simplified policies usando SOLO user_profiles
CREATE POLICY "Users can view own emails v3"
ON email_messages FOR SELECT
USING (
  user_email IN (
    SELECT tmwe_email FROM user_profiles WHERE user_id = auth.uid()
  )
  OR (
    is_shared_email = true 
    AND EXISTS (
      SELECT 1 FROM shared_email_members 
      WHERE shared_email_members.shared_email_id = email_messages.shared_email_id 
      AND shared_email_members.user_id = auth.uid() 
      AND shared_email_members.can_read = true
    )
  )
);

CREATE POLICY "Users can insert own emails v3"
ON email_messages FOR INSERT
WITH CHECK (
  user_email IN (
    SELECT tmwe_email FROM user_profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own emails v3"
ON email_messages FOR UPDATE
USING (
  user_email IN (
    SELECT tmwe_email FROM user_profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own emails v3"
ON email_messages FOR DELETE
USING (
  user_email IN (
    SELECT tmwe_email FROM user_profiles WHERE user_id = auth.uid()
  )
);