export interface RadioMessage {
  id: string;
  conversation_id?: string;
  sender_type: 'human' | 'chatgpt' | 'gemini' | 'claude';
  sender_name: string;
  content: string;
  audio_url?: string | null;
  token_input?: number;
  token_output?: number;
  tempo_risposta_ms?: number;
  attachments?: any;
  images?: string[];
  generated_images?: string[];
  is_visible_to_ai?: boolean;
  created_at: string;
}
