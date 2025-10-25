export interface RadioMessage {
  id: string;
  sender_type: string;
  sender_name: string;
  content: string;
  audio_url?: string | null;
  created_at: string;
}
