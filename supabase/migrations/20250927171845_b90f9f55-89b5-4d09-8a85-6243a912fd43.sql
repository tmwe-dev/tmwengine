-- Create policies for public access to attachment files
CREATE POLICY "Public access to attachment files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'import-files' AND (storage.foldername(name))[1] = 'attachments');

-- Allow authenticated users to upload attachments
CREATE POLICY "Allow authenticated uploads to attachments folder" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'import-files' AND (storage.foldername(name))[1] = 'attachments');

-- Allow users to delete their attachments
CREATE POLICY "Allow authenticated delete from attachments folder" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'import-files' AND (storage.foldername(name))[1] = 'attachments');