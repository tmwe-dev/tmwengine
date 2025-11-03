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
 * Pulisce il body HTML rimuovendo citazioni, messaggi originali e risposte
 */
export const cleanEmailBody = (html: string): string => {
  if (!html) return '';
  
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Rimuovi blocchi di citazione comuni
  const selectorsToRemove = [
    'blockquote',
    '[class*="quote"]',
    '[class*="quoted"]',
    '[id*="quote"]',
    '[class*="gmail_quote"]',
    '[class*="moz-cite-prefix"]',
    '.gmail_extra',
    '[class*="yahoo_quoted"]',
    'div[style*="border-left"]', // Citazioni con bordo sinistro
  ];
  
  selectorsToRemove.forEach(selector => {
    const elements = tempDiv.querySelectorAll(selector);
    elements.forEach(el => el.remove());
  });
  
  // Rimuovi separatori tipo "---- Original Message ----"
  const allText = tempDiv.textContent || '';
  if (allText.includes('Original Message') || 
      allText.includes('Messaggio originale') ||
      allText.includes('Da:') && allText.includes('Inviato:') ||
      allText.includes('From:') && allText.includes('Sent:')) {
    // Cerca pattern di intestazione email forwarded
    const children = Array.from(tempDiv.children);
    let foundSeparator = false;
    
    children.forEach(child => {
      const text = child.textContent || '';
      if (text.includes('Original Message') || 
          text.includes('Messaggio originale') ||
          (text.includes('Da:') && text.includes('Inviato:')) ||
          (text.includes('From:') && text.includes('Sent:'))) {
        foundSeparator = true;
      }
      if (foundSeparator) {
        child.remove();
      }
    });
  }
  
  return tempDiv.innerHTML;
};
