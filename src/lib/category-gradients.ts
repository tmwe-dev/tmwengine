export const getCategoryGradient = (category: string): string => {
  const categoryKey = category.split(' / ')[0].toLowerCase();
  
  const gradients: Record<string, string> = {
    'marketing': 'bg-gradient-to-r from-rose-500/80 to-pink-400/70',
    'logistica': 'bg-gradient-to-r from-sky-500 to-cyan-400',
    'bolle': 'bg-gradient-to-r from-sky-500 to-cyan-400',
    'documenti spedizione': 'bg-gradient-to-r from-sky-500 to-cyan-400',
    'amministrazione': 'bg-gradient-to-r from-violet-500 to-indigo-400',
    'fatture': 'bg-gradient-to-r from-violet-500 to-indigo-400',
    'it': 'bg-gradient-to-r from-emerald-500 to-teal-400',
    'sicurezza': 'bg-gradient-to-r from-emerald-500 to-teal-400',
    'spam': 'bg-gradient-to-r from-zinc-600 to-gray-700',
    'non rilevante': 'bg-gradient-to-r from-zinc-600 to-gray-700',
  };
  
  return gradients[categoryKey] || 'bg-gradient-to-r from-blue-500 to-cyan-400';
};

export const getCategoryGlow = (category: string): string => {
  const categoryKey = category.split(' / ')[0].toLowerCase();
  
  const glows: Record<string, string> = {
    'marketing': 'shadow-[0_0_12px_rgba(255,100,150,0.3)]',
    'logistica': 'shadow-[0_0_12px_rgba(14,165,233,0.3)]',
    'bolle': 'shadow-[0_0_12px_rgba(14,165,233,0.3)]',
    'amministrazione': 'shadow-[0_0_12px_rgba(139,92,246,0.3)]',
    'fatture': 'shadow-[0_0_12px_rgba(139,92,246,0.3)]',
    'it': 'shadow-[0_0_12px_rgba(16,185,129,0.3)]',
    'sicurezza': 'shadow-[0_0_12px_rgba(16,185,129,0.3)]',
    'spam': 'shadow-[0_0_12px_rgba(82,82,91,0.2)]',
  };
  
  return glows[categoryKey] || 'shadow-[0_0_12px_rgba(0,200,255,0.2)]';
};
