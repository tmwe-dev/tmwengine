/**
 * Utility per analisi email e riconoscimento geografico
 */

import countriesData from '@/data/countries-enhanced.json';

interface Country {
  code: string;
  name: string;
  flag: string;
}

const countries: Country[] = countriesData;

/**
 * TLD mapping per riconoscimento paese da dominio email
 */
const TLD_TO_COUNTRY: Record<string, string> = {
  // Europa
  'uk': 'GB', 'co.uk': 'GB', 'org.uk': 'GB',
  'de': 'DE',
  'fr': 'FR',
  'it': 'IT',
  'es': 'ES',
  'nl': 'NL',
  'be': 'BE',
  'at': 'AT',
  'ch': 'CH',
  'se': 'SE',
  'no': 'NO',
  'dk': 'DK',
  'fi': 'FI',
  'pl': 'PL',
  'pt': 'PT',
  'gr': 'GR',
  'ie': 'IE',
  'cz': 'CZ',
  'ro': 'RO',
  'hu': 'HU',
  
  // Asia
  'cn': 'CN',
  'jp': 'JP',
  'in': 'IN',
  'kr': 'KR',
  'sg': 'SG',
  'hk': 'CN', // Hong Kong -> China flag
  'tw': 'TW',
  'th': 'TH',
  'my': 'MY',
  'id': 'ID',
  'ph': 'PH',
  'vn': 'VN',
  'pk': 'PK',
  'ae': 'AE',
  'sa': 'SA',
  'il': 'IL',
  'tr': 'TR',
  
  // Americhe
  'us': 'US',
  'ca': 'CA',
  'br': 'BR',
  'mx': 'MX',
  'ar': 'AR',
  'cl': 'CL',
  'co': 'CO',
  've': 'VE',
  'pe': 'PE',
  
  // Africa
  'za': 'ZA',
  'eg': 'EG',
  'ng': 'NG',
  'ke': 'KE',
  'ma': 'MA',
  
  // Oceania
  'au': 'AU',
  'nz': 'NZ',
  
  // Russia e Ex-USSR
  'ru': 'RU',
  'ua': 'UA',
};

/**
 * Estrae TLD da email (gestisce anche multi-level TLD come .co.uk)
 */
function extractTLD(email: string): string | null {
  const domain = email.split('@')[1];
  if (!domain) return null;
  
  const parts = domain.toLowerCase().split('.');
  if (parts.length < 2) return null;
  
  // Check multi-level TLD (es: .co.uk)
  if (parts.length >= 3) {
    const multiLevelTLD = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
    if (TLD_TO_COUNTRY[multiLevelTLD]) {
      return multiLevelTLD;
    }
  }
  
  // Single level TLD (es: .com, .it)
  return parts[parts.length - 1];
}

/**
 * Rileva paese da email domain
 * Ritorna country code ISO (es: 'IT', 'US', 'CN') o null
 */
export function detectCountryFromEmail(email: string): string | null {
  if (!email || !email.includes('@')) return null;
  
  const tld = extractTLD(email);
  if (!tld) return null;
  
  // Generic TLDs (.com, .net, .org, .io) -> no country
  const genericTLDs = ['com', 'net', 'org', 'io', 'biz', 'info', 'edu', 'gov', 'mil'];
  if (genericTLDs.includes(tld)) return null;
  
  return TLD_TO_COUNTRY[tld] || null;
}

/**
 * Get country flag emoji da country code
 */
export function getCountryFlag(countryCode: string | null): string | null {
  if (!countryCode) return null;
  
  const country = countries.find(c => c.code === countryCode.toUpperCase());
  return country?.flag || null;
}

/**
 * Get country name da country code
 */
export function getCountryName(countryCode: string | null): string | null {
  if (!countryCode) return null;
  
  const country = countries.find(c => c.code === countryCode.toUpperCase());
  return country?.name || null;
}

/**
 * Check se email è da un dominio specifico
 */
export function isDomainMatch(email: string, domains: string[]): boolean {
  const emailDomain = email.split('@')[1]?.toLowerCase();
  if (!emailDomain) return false;
  
  return domains.some(domain => 
    emailDomain === domain.toLowerCase() || 
    emailDomain.endsWith(`.${domain.toLowerCase()}`)
  );
}
