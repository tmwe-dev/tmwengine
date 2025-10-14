-- Create table for system languages configuration
CREATE TABLE IF NOT EXISTS public.system_languages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  native_name text NOT NULL,
  flag text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_languages ENABLE ROW LEVEL SECURITY;

-- Everyone can read system languages
CREATE POLICY "Everyone can view system languages"
  ON public.system_languages
  FOR SELECT
  USING (true);

-- Only admins can manage system languages
CREATE POLICY "Admins can manage system languages"
  ON public.system_languages
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Insert default languages
INSERT INTO public.system_languages (code, name, native_name, flag, is_active, order_index)
VALUES 
  ('it', 'Italian', 'Italiano', '🇮🇹', true, 1),
  ('en', 'English', 'English', '🇬🇧', true, 2),
  ('es', 'Spanish', 'Español', '🇪🇸', true, 3),
  ('fr', 'French', 'Français', '🇫🇷', true, 4),
  ('de', 'German', 'Deutsch', '🇩🇪', true, 5)
ON CONFLICT (code) DO NOTHING;

-- Add trigger for updated_at
CREATE TRIGGER update_system_languages_updated_at
  BEFORE UPDATE ON public.system_languages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();