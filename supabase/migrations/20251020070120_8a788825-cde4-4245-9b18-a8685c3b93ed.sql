-- ============================================
-- DESIGN LAB: SISTEMA DI CATALOGAZIONE E PLUGIN
-- ============================================

-- 1. Tabella per maschere scansionate (pagine sorgente)
CREATE TABLE public.design_lab_source_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_name TEXT NOT NULL,
  page_path TEXT NOT NULL,
  category TEXT,
  description TEXT,
  thumbnail_url TEXT,
  total_components INTEGER DEFAULT 0,
  total_functions INTEGER DEFAULT 0,
  complexity_score INTEGER CHECK (complexity_score >= 1 AND complexity_score <= 10),
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Tabella per componenti estratti
CREATE TABLE public.design_lab_extracted_components (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_page_id UUID REFERENCES public.design_lab_source_pages(id) ON DELETE CASCADE,
  component_name TEXT NOT NULL,
  component_type TEXT NOT NULL,
  jsx_code TEXT NOT NULL,
  preview_html TEXT,
  thumbnail_url TEXT,
  dependencies JSONB DEFAULT '[]'::jsonb,
  props_schema JSONB DEFAULT '{}'::jsonb,
  position_in_source JSONB DEFAULT '{}'::jsonb,
  usage_count INTEGER DEFAULT 0,
  is_reusable BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Tabella per funzioni estratte
CREATE TABLE public.design_lab_extracted_functions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_page_id UUID REFERENCES public.design_lab_source_pages(id) ON DELETE CASCADE,
  component_id UUID REFERENCES public.design_lab_extracted_components(id) ON DELETE SET NULL,
  function_name TEXT NOT NULL,
  function_type TEXT NOT NULL,
  description TEXT,
  code_original TEXT NOT NULL,
  code_generic TEXT NOT NULL,
  dependencies JSONB DEFAULT '[]'::jsonb,
  parameters JSONB DEFAULT '{}'::jsonb,
  return_type TEXT,
  is_async BOOLEAN DEFAULT false,
  complexity_score INTEGER CHECK (complexity_score >= 1 AND complexity_score <= 10),
  event_handlers JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Tabella per plugin completi
CREATE TABLE public.design_lab_plugins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plugin_name TEXT NOT NULL UNIQUE,
  plugin_type TEXT NOT NULL,
  description TEXT,
  category TEXT,
  thumbnail_url TEXT,
  version TEXT DEFAULT '1.0.0',
  supabase_version TEXT NOT NULL,
  generic_version TEXT NOT NULL,
  components_included JSONB DEFAULT '[]'::jsonb,
  functions_included JSONB DEFAULT '[]'::jsonb,
  hooks_included JSONB DEFAULT '[]'::jsonb,
  required_tables JSONB DEFAULT '[]'::jsonb,
  config_schema JSONB DEFAULT '{}'::jsonb,
  export_path TEXT,
  is_exported BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  rating NUMERIC(3,2) CHECK (rating >= 0 AND rating <= 5),
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Tabella per libreria hook personalizzati
CREATE TABLE public.design_lab_hooks_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hook_name TEXT NOT NULL UNIQUE,
  hook_path TEXT NOT NULL,
  code_original TEXT NOT NULL,
  code_customizable TEXT NOT NULL,
  description TEXT,
  dependencies JSONB DEFAULT '[]'::jsonb,
  usage_example TEXT,
  is_system_hook BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indici per performance
CREATE INDEX idx_source_pages_category ON public.design_lab_source_pages(category);
CREATE INDEX idx_extracted_components_source_page ON public.design_lab_extracted_components(source_page_id);
CREATE INDEX idx_extracted_components_type ON public.design_lab_extracted_components(component_type);
CREATE INDEX idx_extracted_functions_source_page ON public.design_lab_extracted_functions(source_page_id);
CREATE INDEX idx_extracted_functions_component ON public.design_lab_extracted_functions(component_id);
CREATE INDEX idx_extracted_functions_type ON public.design_lab_extracted_functions(function_type);
CREATE INDEX idx_plugins_category ON public.design_lab_plugins(category);
CREATE INDEX idx_plugins_type ON public.design_lab_plugins(plugin_type);
CREATE INDEX idx_plugins_tags ON public.design_lab_plugins USING GIN(tags);

-- Enable RLS
ALTER TABLE public.design_lab_source_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_lab_extracted_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_lab_extracted_functions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_lab_plugins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_lab_hooks_library ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Tutti possono vedere, solo autenticati possono modificare
CREATE POLICY "Anyone can view source pages"
  ON public.design_lab_source_pages FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert source pages"
  ON public.design_lab_source_pages FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view extracted components"
  ON public.design_lab_extracted_components FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert extracted components"
  ON public.design_lab_extracted_components FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view extracted functions"
  ON public.design_lab_extracted_functions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert extracted functions"
  ON public.design_lab_extracted_functions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view plugins"
  ON public.design_lab_plugins FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage their plugins"
  ON public.design_lab_plugins FOR ALL
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Anyone can view hooks library"
  ON public.design_lab_hooks_library FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert hooks"
  ON public.design_lab_hooks_library FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Trigger per aggiornamento automatico updated_at
CREATE TRIGGER update_source_pages_updated_at
  BEFORE UPDATE ON public.design_lab_source_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_plugins_updated_at
  BEFORE UPDATE ON public.design_lab_plugins
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();