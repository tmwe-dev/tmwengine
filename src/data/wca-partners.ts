/**
 * Lista domini WCA Partner certificati
 * 
 * WCA (World Cargo Alliance) è una rete globale di spedizionieri
 * certificati. Questi domini identificano partner affidabili.
 */

export const WCA_PARTNER_DOMAINS = [
  'wcaworld.com',
  'wca-network.com',
  'wca-family.com',
  
  // Aggiungi qui altri domini WCA noti
  // Esempio: 'example-wca-member.com'
];

/**
 * Check se email è da WCA Partner
 */
export function isWCAPartner(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  
  return WCA_PARTNER_DOMAINS.some(wcaDomain => 
    domain === wcaDomain || 
    domain.endsWith(`.${wcaDomain}`)
  );
}
