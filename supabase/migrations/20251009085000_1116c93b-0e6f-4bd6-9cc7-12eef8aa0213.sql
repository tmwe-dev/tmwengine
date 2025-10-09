-- Aggiungi campi per AI chat assistant in intranet_room_ai_prompts
ALTER TABLE public.intranet_room_ai_prompts
ADD COLUMN IF NOT EXISTS ai_context_messages integer NOT NULL DEFAULT 20,
ADD COLUMN IF NOT EXISTS ai_invocations_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_max_invocations integer NOT NULL DEFAULT 30;

COMMENT ON COLUMN public.intranet_room_ai_prompts.ai_context_messages IS 'Numero di messaggi precedenti da inviare come contesto all''AI';
COMMENT ON COLUMN public.intranet_room_ai_prompts.ai_invocations_count IS 'Contatore invocazioni AI per questa stanza';
COMMENT ON COLUMN public.intranet_room_ai_prompts.ai_max_invocations IS 'Numero massimo di invocazioni AI permesse';

-- Crea utente virtuale AI "Albert" con UUID fisso
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'albert@ai.assistant',
  crypt('ai-assistant-no-login', gen_salt('bf')),
  now(),
  '{"provider":"system","providers":["system"]}'::jsonb,
  '{"display_name":"🤖 Albert AI"}'::jsonb,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Crea profilo per Albert
INSERT INTO public.user_profiles (
  user_id,
  display_name,
  preferred_language,
  reading_language,
  writing_language,
  availability_status
)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  '🤖 Albert AI',
  'it',
  'it',
  'it',
  'online'
)
ON CONFLICT (user_id) DO UPDATE
SET display_name = '🤖 Albert AI';

-- Funzione per resettare il contatore invocazioni AI
CREATE OR REPLACE FUNCTION public.reset_ai_invocations(p_room_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.intranet_room_ai_prompts
  SET ai_invocations_count = 0
  WHERE room_id = p_room_id;
END;
$$;