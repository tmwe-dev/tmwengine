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
  
  // 1. Rimuovi solo <blockquote> espliciti (citazioni standard)
  const blockquotes = tempDiv.querySelectorAll('blockquote');
  blockquotes.forEach(el => el.remove());
  
  // 2. Rimuovi elementi con classi "quote" evidenti (Gmail, Yahoo)
  const quotedElements = tempDiv.querySelectorAll(
    '[class*="gmail_quote"], [class*="yahoo_quoted"], .gmail_extra'
  );
  quotedElements.forEach(el => el.remove());
  
  // 3. Trova separatori espliciti tipo "---- Original Message ----"
  // e rimuovi TUTTO DOPO (non prima!)
  const allText = tempDiv.innerHTML;
  
  // Pattern separatori comuni (multi-lingua)
  const separatorPatterns = [
    /[-_]{3,}\s*(Original Message|Messaggio originale|Message d'origine)/i,
    /<hr[^>]*>/i, // Linea orizzontale
    /From:\s*[^\n]+\nSent:\s*[^\n]+/i, // Header email forwarded
    /Da:\s*[^\n]+\nInviato:\s*[^\n]+/i // Header italiano
  ];
  
  let cleanedHtml = tempDiv.innerHTML;
  
  for (const pattern of separatorPatterns) {
    const match = cleanedHtml.match(pattern);
    if (match && match.index !== undefined) {
      // Tronca tutto DOPO il separatore
      cleanedHtml = cleanedHtml.substring(0, match.index);
      break; // Usa solo il primo separatore trovato
    }
  }
  
  return cleanedHtml;
};
