-- Create audio-responses storage bucket for Bar Chat audio files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audio-responses',
  'audio-responses',
  true,
  10485760, -- 10MB limit
  ARRAY['audio/mpeg', 'audio/mp3']
);

-- RLS policies for audio-responses bucket
CREATE POLICY "Anyone can view audio responses"
ON storage.objects FOR SELECT
USING (bucket_id = 'audio-responses');

CREATE POLICY "System can upload audio responses"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'audio-responses');

CREATE POLICY "System can delete old audio responses"
ON storage.objects FOR DELETE
USING (bucket_id = 'audio-responses');