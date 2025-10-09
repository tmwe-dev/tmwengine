-- Fix Albert AI user creation to avoid listUsers() errors

-- First, remove the incorrectly created Albert user if exists
DELETE FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000001';

-- Create Albert AI user properly using admin function
DO $$
DECLARE
  albert_id uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Insert Albert into auth.users with all required fields properly set
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at,
    confirmation_token,
    email_change_token_current,
    email_change_token_new
  ) VALUES (
    albert_id,
    '00000000-0000-0000-0000-000000000000',
    'albert@system.ai',
    crypt('', gen_salt('bf')),
    now(),
    '{"provider":"system","providers":["system"]}',
    '{"name":"🤖 Albert AI","is_ai":true}',
    'authenticated',
    'authenticated',
    now(),
    now(),
    '',  -- Empty string instead of NULL
    '',  -- Empty string instead of NULL
    ''   -- Empty string instead of NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    confirmation_token = '',
    email_change_token_current = '',
    email_change_token_new = '';

  -- Ensure profile exists
  INSERT INTO public.user_profiles (user_id, display_name)
  VALUES (albert_id, '🤖 Albert AI')
  ON CONFLICT (user_id) DO UPDATE SET
    display_name = EXCLUDED.display_name;
END $$;