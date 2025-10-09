-- Policy per permettere agli utenti autenticati di caricare file nel bucket chat-attachments
CREATE POLICY "Authenticated users can upload to chat-attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-attachments');

-- Policy per permettere a tutti di leggere i file dal bucket chat-attachments (pubblico)
CREATE POLICY "Anyone can read from chat-attachments"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'chat-attachments');

-- Policy per permettere agli utenti di eliminare i propri file
CREATE POLICY "Users can delete their own files from chat-attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);