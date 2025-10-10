-- Fix RLS policies per email_messages
-- Rimuovi la policy difettosa appena creata
DROP POLICY IF EXISTS "Users can view shared emails" ON email_messages;

-- Aggiorna le policy esistenti per supportare tmwe_email
DROP POLICY IF EXISTS "Users can view own emails" ON email_messages;
DROP POLICY IF EXISTS "Users can insert own emails" ON email_messages;
DROP POLICY IF EXISTS "Users can update own emails" ON email_messages;
DROP POLICY IF EXISTS "Users can delete own emails" ON email_messages;

-- Ricrea policy corrette che funzionano con tmwe_email
CREATE POLICY "Users can view own emails v2"
ON email_messages FOR SELECT
TO authenticated
USING (
  user_email IN (
    SELECT email FROM auth.users WHERE id = auth.uid()
    UNION
    SELECT tmwe_email FROM user_profiles WHERE user_id = auth.uid()
  )
  OR
  (
    is_shared_email = true 
    AND EXISTS (
      SELECT 1 FROM shared_email_members 
      WHERE shared_email_id = email_messages.shared_email_id 
      AND user_id = auth.uid()
      AND can_read = true
    )
  )
);

CREATE POLICY "Users can insert own emails v2"
ON email_messages FOR INSERT
TO authenticated
WITH CHECK (
  user_email IN (
    SELECT email FROM auth.users WHERE id = auth.uid()
    UNION
    SELECT tmwe_email FROM user_profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own emails v2"
ON email_messages FOR UPDATE
TO authenticated
USING (
  user_email IN (
    SELECT email FROM auth.users WHERE id = auth.uid()
    UNION
    SELECT tmwe_email FROM user_profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own emails v2"
ON email_messages FOR DELETE
TO authenticated
USING (
  user_email IN (
    SELECT email FROM auth.users WHERE id = auth.uid()
    UNION
    SELECT tmwe_email FROM user_profiles WHERE user_id = auth.uid()
  )
);