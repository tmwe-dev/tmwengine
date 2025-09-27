-- Make the import-files bucket public for attachments
UPDATE storage.buckets 
SET public = true 
WHERE id = 'import-files';