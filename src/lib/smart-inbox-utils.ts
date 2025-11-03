export const CATEGORIES = [
  { id: 'Fatture', name: 'Fatture', icon: '💰', color: '#3B82F6' },
  { id: 'Bolle / Packing List', name: 'Bolle', icon: '📦', color: '#10B981' },
  { id: 'Preventivi / Quotazioni', name: 'Preventivi', icon: '📊', color: '#F59E0B' },
  { id: 'Rate Aeree / Rate Navali', name: 'Rate', icon: '✈️', color: '#8B5CF6' },
  { id: 'Documenti Spedizione', name: 'Documenti', icon: '📄', color: '#06B6D4' },
  { id: 'Offerte di Lavoro', name: 'Lavoro', icon: '💼', color: '#EC4899' },
  { id: 'Marketing / Pubblicità', name: 'Marketing', icon: '📢', color: '#F43F5E' },
  { id: 'Spam / Non Rilevante', name: 'Spam', icon: '🚫', color: '#6B7280' }
];

// 🆕 EXPORT categorie trasporti per utilizzo avanzato
export { TRANSPORT_CATEGORIES, getTransportCategory, getTransportCategoryByName, getTransportCategoryColor, getTransportCategoryIcon } from './transport-categories';

export const getCategoryColor = (category: string): string => {
  return CATEGORIES.find(c => c.id === category)?.color || '#6B7280';
};

export const getCategoryIcon = (category: string): string => {
  return CATEGORIES.find(c => c.id === category)?.icon || '📧';
};

export const extractDomain = (email: string): string => {
  return email.split('@')[1]?.toLowerCase() || '';
};

export const extractCompanyName = (email: string): string => {
  const domain = extractDomain(email);
  return domain.split('.')[0]
    .replace(/^(mail|smtp|email|webmail)\./, '')
    .split(/[_-]/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

export const extractInitials = (email: string): string => {
  const name = extractCompanyName(email);
  return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins} min fa`;
  if (diffHours < 24) return `${diffHours} ore fa`;
  if (diffDays === 0) return 'Oggi';
  if (diffDays === 1) return 'Ieri';
  if (diffDays < 7) return `${diffDays} giorni fa`;
  
  return date.toLocaleDateString('it-IT', { 
    day: '2-digit', 
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
};

// 🆕 Data completa per header email (opzionale)
export const formatDateDetailed = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};