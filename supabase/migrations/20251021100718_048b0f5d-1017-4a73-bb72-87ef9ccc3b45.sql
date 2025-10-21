-- Aggiungere thumbnail_url a chat_laboratory_prompt_sections
ALTER TABLE chat_laboratory_prompt_sections 
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

COMMENT ON COLUMN chat_laboratory_prompt_sections.thumbnail_url IS 
'URL pubblico dell''immagine miniatura salvata in Supabase Storage (bucket: chat-laboratory)';

-- Creare tabella per prompt composti
CREATE TABLE IF NOT EXISTS chat_laboratory_composed_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  target_agent TEXT NOT NULL CHECK (target_agent IN ('gpt-4', 'claude-3', 'gemini-pro')),
  section_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger per updated_at
CREATE OR REPLACE FUNCTION update_chat_laboratory_composed_prompts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_composed_prompts_updated_at
  BEFORE UPDATE ON chat_laboratory_composed_prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_laboratory_composed_prompts_updated_at();

-- RLS policies
ALTER TABLE chat_laboratory_composed_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view composed prompts"
ON chat_laboratory_composed_prompts
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can manage composed prompts"
ON chat_laboratory_composed_prompts
FOR ALL
USING (auth.role() = 'authenticated');

-- Creare bucket pubblico per thumbnail prompt (se non esiste)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-laboratory', 'chat-laboratory', true)
ON CONFLICT (id) DO NOTHING;

-- Policy per upload (solo autenticati)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can upload prompt thumbnails'
  ) THEN
    CREATE POLICY "Authenticated users can upload prompt thumbnails"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'chat-laboratory' 
      AND (storage.foldername(name))[1] = 'prompt-thumbnails'
    );
  END IF;
END $$;

-- Policy per aggiornamento
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can update prompt thumbnails'
  ) THEN
    CREATE POLICY "Authenticated users can update prompt thumbnails"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'chat-laboratory' 
      AND (storage.foldername(name))[1] = 'prompt-thumbnails'
    );
  END IF;
END $$;

-- Policy per lettura pubblica
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Anyone can view prompt thumbnails'
  ) THEN
    CREATE POLICY "Anyone can view prompt thumbnails"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'chat-laboratory');
  END IF;
END $$;

-- Policy per cancellazione (solo autenticati)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can delete prompt thumbnails'
  ) THEN
    CREATE POLICY "Authenticated users can delete prompt thumbnails"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'chat-laboratory' 
      AND (storage.foldername(name))[1] = 'prompt-thumbnails'
    );
  END IF;
END $$;