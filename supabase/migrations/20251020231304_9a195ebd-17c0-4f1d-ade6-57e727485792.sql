-- TICKET 1: Database Schema Extensions for Design Lab Intelligence
-- Aggiunge metadati semantici per ricerca e catalogazione avanzata

-- =====================================================
-- STEP 1: Estendere design_lab_extracted_components
-- =====================================================
ALTER TABLE design_lab_extracted_components
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS fields_schema JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS section TEXT,
ADD COLUMN IF NOT EXISTS compatibility_context JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ui_category TEXT,
ADD COLUMN IF NOT EXISTS complexity_level TEXT DEFAULT 'medium';

-- Commenti per documentazione
COMMENT ON COLUMN design_lab_extracted_components.tags IS 'Array di tag funzionali auto-generati (es. form-validation, api-call, data-table)';
COMMENT ON COLUMN design_lab_extracted_components.fields_schema IS 'Schema dettagliato dei campi/props con tipo, label, validazione';
COMMENT ON COLUMN design_lab_extracted_components.section IS 'Sezione della pagina originale (es. Header, Form Principale, Sidebar)';
COMMENT ON COLUMN design_lab_extracted_components.compatibility_context IS 'Contesto di compatibilità (domain, requires_auth, requires_database, etc.)';
COMMENT ON COLUMN design_lab_extracted_components.ui_category IS 'Categoria UI (Form, Table, Card, Navigation, etc.)';
COMMENT ON COLUMN design_lab_extracted_components.complexity_level IS 'Livello di complessità: low, medium, high';

-- =====================================================
-- STEP 2: Estendere design_lab_extracted_functions
-- =====================================================
ALTER TABLE design_lab_extracted_functions
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS applicable_to TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS compatible_contexts TEXT[] DEFAULT '{}';

COMMENT ON COLUMN design_lab_extracted_functions.tags IS 'Tag funzionali per categorizzazione (validation, api-call, event-handler)';
COMMENT ON COLUMN design_lab_extracted_functions.applicable_to IS 'Tipi di componenti/campi a cui la funzione è applicabile (input, select, button)';
COMMENT ON COLUMN design_lab_extracted_functions.compatible_contexts IS 'Contesti in cui la funzione è utilizzabile (form, table, modal)';

-- =====================================================
-- STEP 3: Creare tabella configurazioni pagine
-- =====================================================
CREATE TABLE IF NOT EXISTS design_lab_page_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES design_lab_pages(id) ON DELETE CASCADE,
  source_page_id UUID REFERENCES design_lab_source_pages(id) ON DELETE SET NULL,
  component_mappings JSONB DEFAULT '[]',
  function_bindings JSONB DEFAULT '[]',
  validation_rules JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(page_id)
);

COMMENT ON TABLE design_lab_page_configurations IS 'Configurazioni per pagine Design Lab: mappature componenti, binding funzioni, regole validazione';
COMMENT ON COLUMN design_lab_page_configurations.component_mappings IS 'Array di mappature componenti: {source_component_id, target_position, config_overrides, validation_passed}';
COMMENT ON COLUMN design_lab_page_configurations.function_bindings IS 'Array di binding funzioni: {function_id, target_field_id, event_type, parameters}';
COMMENT ON COLUMN design_lab_page_configurations.validation_rules IS 'Regole di validazione custom per la pagina';

-- =====================================================
-- STEP 4: Indici per performance
-- =====================================================

-- Indici GIN per ricerca array (tags)
CREATE INDEX IF NOT EXISTS idx_components_tags ON design_lab_extracted_components USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_functions_tags ON design_lab_extracted_functions USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_functions_applicable_to ON design_lab_extracted_functions USING GIN (applicable_to);

-- Indici standard per filtri comuni
CREATE INDEX IF NOT EXISTS idx_components_ui_category ON design_lab_extracted_components (ui_category);
CREATE INDEX IF NOT EXISTS idx_components_section ON design_lab_extracted_components (section);
CREATE INDEX IF NOT EXISTS idx_components_complexity ON design_lab_extracted_components (complexity_level);
CREATE INDEX IF NOT EXISTS idx_page_configs_page_id ON design_lab_page_configurations (page_id);

-- Indice JSONB per compatibility_context
CREATE INDEX IF NOT EXISTS idx_components_compatibility_context ON design_lab_extracted_components USING GIN (compatibility_context);

-- =====================================================
-- STEP 5: Trigger per updated_at automatico
-- =====================================================
CREATE OR REPLACE FUNCTION update_page_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_page_config_timestamp ON design_lab_page_configurations;
CREATE TRIGGER trigger_update_page_config_timestamp
  BEFORE UPDATE ON design_lab_page_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_page_config_updated_at();

-- =====================================================
-- STEP 6: RLS Policies per design_lab_page_configurations
-- =====================================================
ALTER TABLE design_lab_page_configurations ENABLE ROW LEVEL SECURITY;

-- Users can view configurations of their own pages
CREATE POLICY "Users can view own page configurations"
  ON design_lab_page_configurations
  FOR SELECT
  USING (
    page_id IN (
      SELECT id FROM design_lab_pages 
      WHERE user_id = auth.uid() OR is_admin(auth.uid())
    )
  );

-- Users can manage configurations of their own pages
CREATE POLICY "Users can manage own page configurations"
  ON design_lab_page_configurations
  FOR ALL
  USING (
    page_id IN (
      SELECT id FROM design_lab_pages 
      WHERE user_id = auth.uid() OR is_admin(auth.uid())
    )
  )
  WITH CHECK (
    page_id IN (
      SELECT id FROM design_lab_pages 
      WHERE user_id = auth.uid() OR is_admin(auth.uid())
    )
  );