/**
 * Categorie specializzate settore trasporti/corrieri
 * NUOVA FUNZIONALITÀ - Non modifica categorie esistenti
 */

export interface TransportCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  keywords: string[]; // Parole chiave per matching automatico
}

/**
 * Categorie specializzate per il settore trasporti/spedizioni
 * 🚚 Utilizzate per classificazione AI avanzata
 */
export const TRANSPORT_CATEGORIES: TransportCategory[] = [
  {
    id: 'invoices',
    name: 'Fatture',
    icon: '💰',
    color: 'hsl(210 100% 50%)', // blue-500
    description: 'Fatture commerciali, invoice, richieste pagamento',
    keywords: ['fattura', 'invoice', 'pagamento', 'payment', 'bill']
  },
  {
    id: 'packing_lists',
    name: 'Bolle / Packing List',
    icon: '📦',
    color: 'hsl(142 76% 36%)', // green-600
    description: 'Liste di imballaggio, packing list, documenti trasporto',
    keywords: ['packing list', 'bolla', 'colli', 'package', 'parcels']
  },
  {
    id: 'quotes',
    name: 'Preventivi / Quotazioni',
    icon: '📊',
    color: 'hsl(38 92% 50%)', // amber-500
    description: 'Richieste preventivo, quotazioni, offerte commerciali',
    keywords: ['preventivo', 'quotazione', 'quote', 'quotation', 'offer']
  },
  {
    id: 'shipping_rates',
    name: 'Rate Aeree / Rate Navali',
    icon: '✈️',
    color: 'hsl(262 83% 58%)', // purple-500
    description: 'Tariffe trasporto aereo/marittimo, rate shipping',
    keywords: ['rate', 'tariffa', 'freight', 'shipping cost', 'aereo', 'navale']
  },
  {
    id: 'shipping_docs',
    name: 'Documenti Spedizione',
    icon: '📄',
    color: 'hsl(189 94% 43%)', // cyan-500
    description: 'Bill of Lading, AWB, documenti doganali, certificati',
    keywords: ['bill of lading', 'awb', 'customs', 'doganale', 'certificate']
  },
  {
    id: 'job_offers',
    name: 'Offerte di Lavoro',
    icon: '💼',
    color: 'hsl(330 81% 60%)', // pink-500
    description: 'Recruiting, posizioni aperte, candidature',
    keywords: ['lavoro', 'job', 'recruiting', 'position', 'candidatura']
  },
  {
    id: 'marketing',
    name: 'Marketing / Pubblicità',
    icon: '📢',
    color: 'hsl(346 77% 50%)', // rose-600
    description: 'Newsletter, promozioni, advertising',
    keywords: ['newsletter', 'promo', 'marketing', 'advertising', 'campaign']
  },
  {
    id: 'spam',
    name: 'Spam / Non Rilevante',
    icon: '🚫',
    color: 'hsl(0 0% 45%)', // gray-600
    description: 'Email spam, irrilevanti, non classificabili',
    keywords: ['spam', 'unsubscribe', 'phishing', 'scam']
  }
];

/**
 * Ottieni categoria per ID
 */
export function getTransportCategory(categoryId: string): TransportCategory | undefined {
  return TRANSPORT_CATEGORIES.find(cat => cat.id === categoryId);
}

/**
 * Ottieni categoria per nome
 */
export function getTransportCategoryByName(name: string): TransportCategory | undefined {
  return TRANSPORT_CATEGORIES.find(cat => 
    cat.name.toLowerCase() === name.toLowerCase()
  );
}

/**
 * Colore categoria per badge UI (compatibile con Tailwind semantic tokens)
 */
export function getTransportCategoryColor(categoryName: string): string {
  const category = getTransportCategoryByName(categoryName);
  return category?.color || 'hsl(var(--muted))';
}

/**
 * Icona categoria per badge UI
 */
export function getTransportCategoryIcon(categoryName: string): string {
  const category = getTransportCategoryByName(categoryName);
  return category?.icon || '📧';
}
