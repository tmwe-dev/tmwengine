/**
 * AI Sender Categorization - Utilities
 * Calcolo costi e supporto per categorizzazione AI dei mittenti
 */

export function calculateEstimatedCost(
  numSenders: number,
  emailsPerSender: number,
  model: string
): { eur: number; is_free: boolean } {
  // Token estimates
  const AVG_TOKENS_PER_EMAIL = 400; // subject + body preview
  const AVG_OUTPUT_TOKENS = 150; // JSON response compatto

  const totalInputTokens = numSenders * emailsPerSender * AVG_TOKENS_PER_EMAIL;
  const totalOutputTokens = numSenders * AVG_OUTPUT_TOKENS;

  // Model pricing (EUR per 1M tokens)
  const pricing: Record<string, { input: number; output: number }> = {
    'google/gemini-2.5-flash': { input: 0, output: 0 }, // FREE
    'google/gemini-2.5-pro': { input: 0.125, output: 0.5 },
    'openai/gpt-5-mini': { input: 0.15, output: 0.6 },
    'openai/gpt-5': { input: 5.0, output: 15.0 },
  };

  const modelPricing = pricing[model] || pricing['google/gemini-2.5-flash'];

  if (modelPricing.input === 0 && modelPricing.output === 0) {
    return { eur: 0, is_free: true };
  }

  const inputCost = (totalInputTokens / 1_000_000) * modelPricing.input;
  const outputCost = (totalOutputTokens / 1_000_000) * modelPricing.output;

  return {
    eur: inputCost + outputCost,
    is_free: false,
  };
}

/**
 * Get default color for group type
 */
export function getDefaultColorForType(type: string): string {
  const colors: Record<string, string> = {
    clienti: '#10b981',
    fornitori: '#f59e0b',
    partner: '#8b5cf6',
    newsletter: '#3b82f6',
    servizi: '#ec4899',
    banche: '#06b6d4',
    notifiche: '#6366f1',
    spam: '#ef4444',
    altro: '#6b7280',
  };
  return colors[type] || colors.altro;
}

/**
 * Get default icon for group type
 */
export function getDefaultIconForType(type: string): string {
  const icons: Record<string, string> = {
    clienti: 'Users',
    fornitori: 'Package',
    partner: 'Handshake',
    newsletter: 'Mail',
    servizi: 'Settings',
    banche: 'Building',
    notifiche: 'Bell',
    spam: 'Trash',
    altro: 'Tag',
  };
  return icons[type] || icons.altro;
}
