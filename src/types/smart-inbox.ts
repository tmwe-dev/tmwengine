export interface EmailClassification {
  id: string;
  email_message_id: string | null; // Legacy field (local UUID)
  email_uid: string | null; // UID sul server IMAP
  folder_name: string | null; // Cartella (es: "INBOX")
  user_email: string;
  category: string;
  confidence: number;
  ai_summary: string | null;
  keywords: string[] | null;
  sender_email: string;
  sender_domain: string;
  sender_logo_url: string | null;
  is_verified: boolean; // Se classificazione verificata manualmente
  created_at: string;
  updated_at: string;
  // 🆕 TMWE API Reference - Primary identifier for API calls
  tmwe_email_id?: number | null; // TMWE API email_id (integer) - use getEmailDetail(tmwe_email_id)
  // 🆕 Campi Smart Inbox Enhancements
  urgency?: 'critical' | 'high' | 'normal' | 'low' | null;
  action_suggested?: string | null;
  detected_patterns?: string[] | null;
  reasoning?: string | null;
  tags?: string[] | null;
  custom_prompt?: string | null;
}

export interface ClassifiedEmail {
  classification: EmailClassification;
  email: {
    uid: string; // UID sul server IMAP
    email_id?: string; // UUID dal DB locale (legacy)
    tmwe_email_id?: number | null; // 🆕 TMWE API email_id (integer) - PRIMARY identifier
    subject: string;
    from: any;
    to: any;
    body_preview?: string;
    body_text?: string;
    body_html?: string;
    date: string;
    read: boolean;
    has_attachments: boolean;
    folder_name: string;
  };
}

export interface EmailMetadata {
  uid?: string | null;
  email_id?: number;
  elasticsearch_id?: string;
  from_email?: string;
  subject: string;
  from: { name?: string; email: string } | string;
  to: any[];
  date: string;
  read: boolean;
  has_attachments: boolean;
  folder_name?: string;
  folder?: string;
  body_preview?: string;
  body_text?: string;
}

export interface CategoryStats {
  id: string;
  name: string;
  icon: string;
  color: string;
  count: number;
}