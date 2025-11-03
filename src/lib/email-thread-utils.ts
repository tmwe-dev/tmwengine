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
 * Ordina email per thread cronologicamente (dal più vecchio al più recente)
 */
export const sortEmailsByDate = (emails: any[]): any[] => {
  return [...emails].sort((a, b) => 
    new Date(a.data_ricezione).getTime() - new Date(b.data_ricezione).getTime()
  );
};
