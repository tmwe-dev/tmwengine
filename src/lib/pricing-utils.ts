import { supabase } from '@/integrations/supabase/client';

interface PricingData {
  provider: string;
  model: string;
  cost_input_eur: number;
  cost_output_eur: number;
  is_free: boolean;
}

let cachedPricing: PricingData[] | null = null;

export async function getPricingData(): Promise<PricingData[]> {
  if (cachedPricing) return cachedPricing;
  
  const { data, error } = await supabase
    .from('ai_pricing_config')
    .select('*');
  
  if (error) {
    console.error('Errore caricamento pricing:', error);
    return [];
  }
  
  cachedPricing = data || [];
  return cachedPricing;
}

export function clearPricingCache() {
  cachedPricing = null;
}

export interface CostBreakdown {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  costPer1000Messages: number;
  isFree: boolean;
}

export async function calculateMessageCost(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number
): Promise<CostBreakdown> {
  const pricingData = await getPricingData();
  
  // Normalizza provider name
  const normalizedProvider = provider.toLowerCase()
    .replace('_', '')
    .replace('lovable', 'lovable')
    .replace('gemini', 'google')
    .replace('chatgpt', 'openai')
    .replace('claude', 'anthropic');
  
  const pricing = pricingData.find(p => 
    p.provider.toLowerCase() === normalizedProvider && 
    (p.model.toLowerCase() === model.toLowerCase() || 
     p.model.toLowerCase().includes(model.toLowerCase()))
  );
  
  if (!pricing || pricing.is_free) {
    return {
      inputCost: 0,
      outputCost: 0,
      totalCost: 0,
      costPer1000Messages: 0,
      isFree: true
    };
  }
  
  const inputCost = (inputTokens / 1_000_000) * pricing.cost_input_eur;
  const outputCost = (outputTokens / 1_000_000) * pricing.cost_output_eur;
  const totalCost = inputCost + outputCost;
  
  return {
    inputCost,
    outputCost,
    totalCost,
    costPer1000Messages: totalCost * 1000,
    isFree: false
  };
}

export function formatCost(cost: number, isFree = false): string {
  if (isFree || cost === 0) return 'GRATIS';
  return `€${cost.toFixed(4)}`;
}

export function formatCostPer1000(cost: number, isFree = false): string {
  if (isFree || cost === 0) return 'GRATIS';
  return `€${cost.toFixed(2)}`;
}
