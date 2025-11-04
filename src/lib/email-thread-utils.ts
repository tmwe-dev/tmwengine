/**
 * Pulisce il subject da prefissi Re:/Fwd: multi-lingua
 * Gestisce: Re, RE, Fwd, FW, I, R, Rif, Fw (IT/EN/ES/DE/FR)
 */
export const cleanSubject = (subject: string): string => {
  if (!subject) return '';
  
  return subject
    .replace(/^(Re:|Fwd:|I:|R:|Fw:|Rif:|RE:|FW:|Res:|RIF:|FWD:)\s*/gi, '')
    .replace(/\[[^\]]*\]/g, '') // Rimuove [tags]
    .replace(/\s+/g, ' ') // Normalizza spazi multipli
    .trim()
    .toLowerCase();
};

/**
 * Genera una chiave univoca per il thread basata su subject pulito + mittenti
 */
export const generateThreadKey = (email: {
  subject: string;
  from_email: string;
  to_email?: any;
}): string => {
  const cleaned = cleanSubject(email.subject);
  const participants = [
    email.from_email,
    ...(Array.isArray(email.to_email) ? email.to_email : [email.to_email])
  ]
    .filter(Boolean)
    .sort()
    .join(',');
  
  return `${cleaned}::${participants}`;
};

/**
 * Determina se due email appartengono allo stesso thread
 */
export const areEmailsInSameThread = (
  email1: { subject: string; from_email: string; to_email?: any },
  email2: { subject: string; from_email: string; to_email?: any }
): boolean => {
  return generateThreadKey(email1) === generateThreadKey(email2);
};

/**
 * Ordina email per thread cronologicamente (dalla più recente alla più vecchia)
 */
export const sortEmailsByDate = (emails: any[]): any[] => {
  return [...emails].sort((a, b) => 
    new Date(b.data_ricezione).getTime() - new Date(a.data_ricezione).getTime()
  );
};

/**
 * Pulisce il body HTML rimuovendo citazioni e messaggi originali
 * VERSIONE MIGLIORATA: preserva contenuto Outlook/Word
 */
export const cleanEmailBody = (html: string): string => {
  if (!html) return '';
  
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // 1. PRIMA rimuovi blockquote standard con selettori CSS precisi
  const quoteSelectors = [
    'blockquote.gmail_quote',
    'div.gmail_quote',
    'div.OutlookMessageHeader',
    'div#divRplyFwdMsg',
    '[class*="yahoo_quoted"]',
    '.gmail_extra'
  ];
  
  quoteSelectors.forEach(selector => {
    const elements = tempDiv.querySelectorAll(selector);
    elements.forEach(el => el.remove());
  });
  
  // Rimuovi anche blockquote generici
  const blockquotes = tempDiv.querySelectorAll('blockquote');
  blockquotes.forEach(el => el.remove());
  
  // 2. SOLO SE blockquote non ha funzionato, usa separator testuali STRINGENTI
  let cleanedHtml = tempDiv.innerHTML;
  
  // Pattern separatori comuni (multi-lingua) - PIÙ STRINGENTI
  const separatorPatterns = [
    /[-_]{10,}\s*(Original Message|Messaggio originale|Message d'origine|Forwarded message)/i,  // Minimo 10 trattini
    /^From:\s+.+\nSent:\s+.+\nTo:\s+.+/im,  // Header Outlook completo (From+Sent+To)
    /^Da:\s+.+\nInviato:\s+.+\nA:\s+.+/im,  // Header Outlook IT completo
    /^On\s+.+\s+wrote:$/im,  // Gmail classic "On [date] [person] wrote:"
    /^Il\s+.+\s+ha scritto:$/im  // Gmail IT "Il [data] [persona] ha scritto:"
  ];
  
  for (const pattern of separatorPatterns) {
    const match = cleanedHtml.match(pattern);
    if (match?.index !== undefined) {
      // Tronca tutto DOPO il separatore
      cleanedHtml = cleanedHtml.substring(0, match.index);
      break; // Usa solo il primo separatore trovato
    }
  }
  
  return cleanedHtml.trim();
};
