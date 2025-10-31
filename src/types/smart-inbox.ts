export interface EmailClassification {
  id: string;
  email_message_id: string;
  user_email: string;
  category: string;
  confidence: number;
  ai_summary: string | null;
  keywords: string[] | null;
  sender_email: string;
  sender_domain: string;
  sender_logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClassifiedEmail {
  classification: EmailClassification;
  email: {
    id: string;
    subject: string;
    from: any;
    to: any;
    body_text: string | null;
    body_html: string | null;
    data_ricezione: string;
    read: boolean;
    has_attachments: boolean;
  };
}

export interface CategoryStats {
  id: string;
  name: string;
  icon: string;
  color: string;
  count: number;
}