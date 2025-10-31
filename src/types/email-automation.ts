// Types per automazione email con AI

// ============================================
// AI PROMPT LIBRARY (Riutilizzabili)
// ============================================

export interface AIPromptLibrary {
  id: string;
  prompt_name: string;
  prompt_description: string | null;
  category: string;
  system_prompt: string;
  default_actions: Array<{
    type: string;
    description: string;
    params?: Record<string, any>;
  }>;
  requires_email_templates: boolean;
  requires_contact_aliases: boolean;
  requires_company_data: boolean;
  ai_config_id: string | null;
  suggested_temperature: number;
  suggested_max_tokens: number;
  usage_count: number;
  last_used_at: string | null;
  created_by: string | null;
  is_public: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

// ============================================
// EMAIL SENDER AI PROMPTS (Con reference a Library)
// ============================================

export interface EmailSenderAIPrompt {
  id: string;
  sender_email: string;
  user_id: string | null;
  prompt_name: string | null;
  prompt_description: string | null;
  ai_prompt: string;
  ai_config_id: string | null;
  base_action: 'archive' | 'move_to_folder' | 'delete' | 'none' | null;
  base_action_params: Record<string, any> | null;
  requires_confirmation: boolean;
  use_email_templates: boolean;
  use_contact_aliases: boolean;
  use_company_data: boolean;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
  last_executed_at: string | null;
  execution_count: number;
  success_count: number;
  failure_count: number;
  // ✅ NUOVI CAMPI
  prompt_library_id: string | null; // Reference a prompt riutilizzabile
  custom_prompt_additions: string | null; // Customizzazioni specifiche sender
  custom_actions: Array<{
    type: string;
    description: string;
    params?: Record<string, any>;
  }> | null;
}

// ============================================
// CONTEXT CACHE
// ============================================

export interface EmailAIContextCache {
  id: string;
  sender_email: string;
  rubrica_id: string | null;
  contact_aliases: {
    nome_completo?: string;
    nome_breve?: string;
    saluto?: string;
    ruolo?: string;
  };
  company_data: {
    ragione_sociale?: string;
    alias?: string;
    settore?: string;
    indirizzo?: string;
  };
  available_templates: Array<{
    id: string;
    name: string;
    subject: string;
    category?: string;
  }>;
  cached_at: string;
  expires_at: string;
}

// ============================================
// INJECTED CONTEXT (Per AI)
// ============================================

export interface AIInjectedContext {
  sender_email: string;
  contact_info?: {
    nome: string;
    cognome?: string;
    azienda?: string;
    ruolo?: string;
    aliases: {
      nome_completo: string;
      saluto: string;
    };
  };
  company_data?: {
    ragione_sociale: string;
    alias: string;
  };
  available_templates?: Array<{
    id: string;
    name: string;
    subject: string;
    body_preview: string;
  }>;
  user_preferences?: {
    email: string;
    nome: string;
    cognome?: string;
    ruolo?: string;
  };
}

export interface EmailAIExecutionLog {
  id: string;
  prompt_id: string;
  email_uid: string;
  sender_email: string;
  user_id: string;
  email_subject: string | null;
  email_body_preview: string | null;
  prompt_used: string;
  context_injected: Record<string, any> | null;
  ai_config_used: Record<string, any> | null;
  ai_response: string | null;
  ai_reasoning: string | null;
  proposed_actions: Array<{
    type: string;
    description: string;
    params?: Record<string, any>;
  }> | null;
  confidence: number | null;
  status: 'pending' | 'confirmed' | 'executed' | 'rejected' | 'failed';
  executed_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface AIActionProposal {
  actions: Array<{
    type: 'archive' | 'move_to_folder' | 'forward' | 'delete' | 'reply' | 'mark_urgent';
    description: string;
    params?: Record<string, any>;
  }>;
  reasoning: string;
  confidence: number; // 0-100
}
