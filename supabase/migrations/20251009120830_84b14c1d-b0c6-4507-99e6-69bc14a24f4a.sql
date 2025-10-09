-- Backup documentation of existing policies (commented for reference)
-- Policy: "Users can view their own chat attachments" (SELECT)
-- Policy: "Users can upload their own chat attachments" (INSERT)
-- Policy: "Users can delete their own chat attachments" (DELETE)
-- Policy: "Users can delete their own files from chat-attachments" (DELETE)
-- Policy: "Anyone can read from chat-attachments" (SELECT)
-- Policy: "Authenticated users can upload to chat-attachments" (INSERT)

-- Drop all existing conflicting policies on chat-attachments bucket
DROP POLICY IF EXISTS "Users can view their own chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files from chat-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read from chat-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to chat-attachments" ON storage.objects;

-- Create new simplified policies for chat-attachments bucket

-- 1. Public read access - allows all users to view/download files
CREATE POLICY "Public read access to chat attachments"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'chat-attachments');

-- 2. Authenticated upload - only logged in users can upload
CREATE POLICY "Authenticated users can upload chat attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-attachments');

-- 3. Delete own files - users can only delete files they uploaded
CREATE POLICY "Users can delete their own chat attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-attachments' 
  AND (storage.foldername(name))[1] = (auth.uid())::text
);