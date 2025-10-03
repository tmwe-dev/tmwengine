-- Modificar la tabla user_tmwe_credentials para usar email como identificador principal
-- en lugar de user_id de auth.users

-- Primero eliminar la tabla existente y recrearla con la nueva estructura
DROP TABLE IF EXISTS public.user_tmwe_credentials;

-- Crear la nueva tabla usando email como identificador principal
CREATE TABLE public.user_tmwe_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  access_token text NOT NULL,
  refresh_token text,
  expires_at bigint,
  client_id text NOT NULL,
  client_secret text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.user_tmwe_credentials ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas las operaciones (ya que no usamos Supabase Auth)
CREATE POLICY "Allow all operations on user_tmwe_credentials"
  ON public.user_tmwe_credentials
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Índice para búsquedas rápidas por email
CREATE INDEX idx_user_tmwe_credentials_email ON public.user_tmwe_credentials(email);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_user_tmwe_credentials_updated_at
  BEFORE UPDATE ON public.user_tmwe_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();