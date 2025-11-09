/**
 * EMAIL MAPPER
 * Normalizza i dati dalle API TMWE al formato del database
 * Gestisce ENTRAMBI i formati API (nested e flat)
 */

export interface NormalizedEmail {
  subject: string;
  from_email: string;
  to_email: string;
  cc_email: string | null;
  bcc_email: string | null;
  body_text: string;
  body_html: string | null;
  date: string;
  attachments: any[];
  in_reply_to: string | null;
  email_references: string | null;
}

/**
 * Estrae un array di email da un campo che può essere:
 * - string singola
 * - oggetto { email, name }
 * - array di oggetti/stringhe
 */
function normalizeEmailList(field: any): string {
  if (!field) return '';
  
  if (typeof field === 'string') {
    return field;
  }
  
  if (Array.isArray(field)) {
    return field
      .map(item => {
        if (typeof item === 'string') return item;
        return item.email || item.address || '';
      })
      .filter(Boolean)
      .join(', ');
  }
  
  if (typeof field === 'object') {
    return field.email || field.address || '';
  }
  
  return '';
}

/**
 * Normalizza una email dalla risposta API al formato DB
 * 
 * @param apiEmail - Risposta raw dall'API TMWE
 * @returns Email normalizzata pronta per l'insert in DB
 */
export function normalizeEmailMessage(apiEmail: any): NormalizedEmail {
  // ✅ Gestisce ENTRAMBI i formati API
  const header = apiEmail?.data?.header || apiEmail || {};
  const body_data = apiEmail?.data || apiEmail || {};
  
  // Estrai campi con fallback multipli
  const subject = header.subject || apiEmail.subject || '(No Subject)';
  const from_email = header.from || apiEmail.from?.email || apiEmail.from || 'Unknown';
  const date = header.date || apiEmail.date || new Date().toISOString();
  
  return {
    subject,
    from_email,
    to_email: normalizeEmailList(header.to || apiEmail.to) || 'Unknown',
    cc_email: normalizeEmailList(header.cc || apiEmail.cc) || null,
    bcc_email: normalizeEmailList(header.bcc || apiEmail.bcc) || null,
    body_text: body_data.body_plain || apiEmail.body || apiEmail.body_plain || '',
    body_html: body_data.body_html || apiEmail.body_html || null,
    date,
    attachments: Array.isArray(header.attachments || apiEmail.attachments) 
      ? (header.attachments || apiEmail.attachments) 
      : [],
    in_reply_to: header.in_reply_to || apiEmail.in_reply_to || null,
    email_references: header.references || apiEmail.references || null,
  };
}

/**
 * Valida che un'email normalizzata abbia i campi minimi richiesti
 */
export function validateNormalizedEmail(email: NormalizedEmail): boolean {
  return Boolean(email.subject || email.from_email);
}

/**
 * Estrae metadata leggera per email_temp_index (senza body)
 */
export function extractEmailMetadata(apiEmail: any): {
  subject: string | null;
  from_email: string;
  from_name: string | null;
  date: string;
} {
  const header = apiEmail?.data?.header || apiEmail || {};
  
  return {
    subject: header.subject || apiEmail?.subject || null,
    from_email: header.from || apiEmail?.from?.email || apiEmail?.from || 'Unknown',
    from_name: header.from_name || apiEmail?.from_name || null,
    date: header.date || apiEmail?.date || new Date().toISOString(),
  };
}
