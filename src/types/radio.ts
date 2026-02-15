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

export interface RadioParticipant {
  id: string;
  type: 'chatgpt' | 'gemini' | 'claude';
  name: string;
  is_active: boolean;
  voice_id?: string;
}

export interface RadioConversation {
  id: string;
  titolo: string | null;
  created_at: string;
  updated_at: string | null;
  riassunto_contesto?: string | null;
  active_participants?: any;
  message_count?: number;
  total_tokens?: number;
}

export type RadioViewMode = 'carousel' | 'messages';
export type RadioSidebarTab = 'conversations' | 'settings';
