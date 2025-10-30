/**
 * Cache locale per classificazioni domini email
 * Evita chiamate AI ripetute per gli stessi domini
 */

export interface DomainClassification {
  domain: string;
  isProvider: boolean;
  companyName: string;
  timestamp: number;
}

const CACHE_KEY = 'email_domain_classifications';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 giorni

/**
 * Recupera classificazione dominio da cache
 */
export function getDomainCache(domain: string): DomainClassification | null {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    const entry = cache[domain];
    
    if (!entry) return null;
    
    // Verifica scadenza
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      delete cache[domain];
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      return null;
    }
    
    return entry;
  } catch (error) {
    console.error('Error reading domain cache:', error);
    return null;
  }
}

/**
 * Salva classificazioni in cache
 */
export function saveDomainCache(classifications: DomainClassification[]) {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    
    classifications.forEach(c => {
      cache[c.domain] = { ...c, timestamp: Date.now() };
    });
    
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Error saving domain cache:', error);
  }
}

/**
 * Ottieni statistiche cache
 */
export function getCacheStats() {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    const entries = Object.values(cache) as DomainClassification[];
    
    return {
      totalDomains: entries.length,
      oldestEntry: entries.length > 0 
        ? Math.min(...entries.map(e => e.timestamp))
        : null
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return { totalDomains: 0, oldestEntry: null };
  }
}

/**
 * Pulisci cache
 */
export function clearDomainCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.error('Error clearing domain cache:', error);
  }
}
