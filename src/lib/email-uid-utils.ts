import { EmailMetadata } from '@/types/smart-inbox';

/**
 * Genera UID univoco per email, usando fallback gerarchico
 * Ordine: uid -> elasticsearch_id -> email_id con prefisso
 */
export function generateEmailUid(email: EmailMetadata | any): string | null {
  return email.uid || 
    email.elasticsearch_id || 
    (email.email_id ? `email_${email.email_id}` : null);
}
