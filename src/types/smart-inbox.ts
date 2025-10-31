export interface EmailClassification {
  id: string;
  email_message_id: string | null; // Legacy field
  email_uid: string | null; // UID sul server TMWE
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
}

export interface ClassifiedEmail {
  classification: EmailClassification;
  email: {
    uid: string; // UID sul server TMWE
    email_id?: number; // ID numerico opzionale
    subject: string;
    from: any;
    to: any;
    body_preview?: string;
    date: string;
    read: boolean;
    has_attachments: boolean;
    folder_name: string;
  };
}

export interface EmailMetadata {
  uid: string;
  email_id: number; // ID numerico per API
  subject: string;
  from: { name?: string; email: string };
  to: any[];
  date: string;
  read: boolean;
  has_attachments: boolean;
  folder_name: string;
  body_preview?: string;
}

export interface CategoryStats {
  id: string;
  name: string;
  icon: string;
  color: string;
  count: number;
}