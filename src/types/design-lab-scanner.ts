export interface SourcePage {
  id: string;
  page_name: string;
  page_path: string;
  category?: string;
  description?: string;
  thumbnail_url?: string;
  total_components: number;
  total_functions: number;
  complexity_score?: number;
  scanned_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ExtractedComponent {
  id: string;
  source_page_id: string;
  component_name: string;
  component_type: string;
  jsx_code: string;
  preview_html?: string;
  thumbnail_url?: string;
  dependencies: any[];
  props_schema: Record<string, any>;
  position_in_source: Record<string, any>;
  usage_count: number;
  is_reusable: boolean;
  created_at: string;
  // TICKET 2: Intelligence metadata
  tags?: string[];
  fields_schema?: any[];
  section?: string;
  compatibility_context?: Record<string, any>;
  ui_category?: string;
  complexity_level?: 'low' | 'medium' | 'high';
}

export interface ExtractedFunction {
  id: string;
  source_page_id: string;
  component_id?: string;
  function_name: string;
  function_type: string;
  description?: string;
  code_original: string;
  code_generic: string;
  dependencies: any[];
  parameters: Record<string, any>;
  return_type?: string;
  is_async: boolean;
  complexity_score?: number;
  event_handlers: string[];
  created_at: string;
  // TICKET 2: Intelligence metadata
  tags?: string[];
  applicable_to?: string[];
  compatible_contexts?: string[];
}

export interface Plugin {
  id: string;
  plugin_name: string;
  plugin_type: string;
  description?: string;
  category?: string;
  thumbnail_url?: string;
  version: string;
  supabase_version: string;
  generic_version: string;
  components_included: any[];
  functions_included: any[];
  hooks_included: any[];
  required_tables: any[];
  config_schema: Record<string, any>;
  export_path?: string;
  is_exported: boolean;
  usage_count: number;
  rating?: number;
  tags: string[];
  user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface HookLibrary {
  id: string;
  hook_name: string;
  hook_path: string;
  code_original: string;
  code_customizable: string;
  description?: string;
  dependencies: any[];
  usage_example?: string;
  is_system_hook: boolean;
  created_at: string;
}

export interface ScanConfig {
  targetPages: string[];
  scanDepth: 'shallow' | 'deep';
  generateThumbnails: boolean;
  extractFunctions: boolean;
  createPlugins: boolean;
  exportFiles: boolean;
}

export interface ScanResult {
  pages_scanned: number;
  components_extracted: number;
  functions_extracted: number;
  plugins_created: number;
  thumbnails_generated: number;
  hooks_cataloged: number;
}
