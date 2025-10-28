// EmailAddress type according to TMWE API spec
export interface EmailAddress {
  name: string;
  email: string;
}

export interface EmailAccount {
  id: string;
  account_name: string;
  email: string;
  imap_host: string;
  imap_port: number;
  imap_encryption: string;
  smtp_host: string;
  smtp_port: number;
  smtp_encryption: string;
  default_account: boolean;
}

export interface EmailFolder {
  name: string;
  display_name?: string;
  unread_count?: number;
  total_count?: number;
}

// Updated to use EmailAddress objects according to API spec
export interface EmailMessage {
  id: string;
  subject: string;
  from: EmailAddress;  // ✅ UPDATED: was string
  to: EmailAddress[];  // ✅ UPDATED: was string[]
  cc?: EmailAddress[]; // ✅ UPDATED: was string[]
  bcc?: EmailAddress[];
  date: string;
  preview?: string;
  body?: string;
  body_type?: 'html' | 'plain';
  read: boolean;
  starred?: boolean;
  flagged?: boolean;
  has_attachments?: boolean;
  hasRules?: boolean;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  size: string;
  content_type: string;
  content_id?: string;
}

// Pagination type according to TMWE API spec
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface SyncStatus {
  status: 'idle' | 'syncing' | 'completed' | 'error';
  progress?: number;
  message?: string;
  last_sync?: string;
}
