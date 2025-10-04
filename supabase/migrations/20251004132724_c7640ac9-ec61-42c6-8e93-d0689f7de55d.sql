-- Insert default email provider if it doesn't exist
INSERT INTO public.email_provider (
  id,
  provider,
  attivo,
  tipo_provider
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'TMWE',
  true,
  'api'
) ON CONFLICT (id) DO NOTHING;