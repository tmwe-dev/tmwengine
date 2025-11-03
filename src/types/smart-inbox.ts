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
    email_id?: string; // ✅ UUID dal DB locale
    subject: string;
    from: any;
    to: any;
    body_preview?: string;
    body_text?: string; // ✅ Aggiunto per body completo dal DB
    body_html?: string; // ✅ Aggiunto per body HTML
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