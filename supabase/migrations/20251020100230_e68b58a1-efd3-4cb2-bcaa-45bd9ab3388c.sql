-- Create storage bucket for design lab thumbnails
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'design-lab-thumbnails',
  'design-lab-thumbnails',
  true,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/webp']
);

-- RLS Policy: Public read access to thumbnails
CREATE POLICY "Public read access to thumbnails"
ON storage.objects FOR SELECT
USING (bucket_id = 'design-lab-thumbnails');

-- RLS Policy: Authenticated users can upload thumbnails
CREATE POLICY "Authenticated users can upload thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'design-lab-thumbnails' 
  AND auth.role() = 'authenticated'
);

-- RLS Policy: Authenticated users can update their thumbnails
CREATE POLICY "Authenticated users can update thumbnails"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'design-lab-thumbnails' 
  AND auth.role() = 'authenticated'
);

-- RLS Policy: Authenticated users can delete thumbnails
CREATE POLICY "Authenticated users can delete thumbnails"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'design-lab-thumbnails' 
  AND auth.role() = 'authenticated'
);