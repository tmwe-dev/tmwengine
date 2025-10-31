// Types per automazione email con AI

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
