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

export interface EmailMessage {
  id: string;
  subject: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  date: string;
  preview?: string;
  body?: string;
  body_type?: 'html' | 'plain';
  read: boolean;
  starred?: boolean;
  flagged?: boolean;
  has_attachments?: boolean;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  size: string;
  content_type: string;
  content_id?: string;
}

export interface SyncStatus {
  status: 'idle' | 'syncing' | 'completed' | 'error';
  progress?: number;
  message?: string;
  last_sync?: string;
}
