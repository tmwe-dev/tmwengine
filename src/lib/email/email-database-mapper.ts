import { NormalizedEmail } from './email-mapper';

/**
 * Prepara un'email normalizzata per l'insert nel database
 * ✅ Unica fonte di verità per mapping campi
 * ✅ Riutilizzabile in tutti i componenti di import
 */
export function prepareEmailForDatabase(
  email: NormalizedEmail,
  folder: string,
  userEmail: string
) {
  return {
    message_id: email.message_id || `${folder}/${email.uid}`,
    from_email: email.from_email || '',
    to_email: email.to_email || '',
    cc_email: email.cc_email || null,
    bcc_email: email.bcc_email || null,
    subject: email.subject || '',
    body_text: email.body_text || '',
    body_html: email.body_html || '',
    data_ricezione: email.date 
      ? new Date(email.date).toISOString() 
      : new Date().toISOString(),
    cartella: folder,
    direzione: 'inbound' as const,
    stato: email.flags?.includes('\\Seen') ? 'letto' as const : 'nuovo' as const,
    flags: Array.isArray(email.flags) ? email.flags : [],
    attachments: Array.isArray(email.attachments) ? email.attachments : [],
    provider_id: '00000000-0000-0000-0000-000000000000',
    user_email: userEmail,
    sync_status: 'sincronizzato' as const,
  };
}
