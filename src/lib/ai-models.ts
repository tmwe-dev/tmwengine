export interface AIModel {
  value: string;
  label: string;
  free?: boolean;
}

export interface AIProvider {
  label: string;
  models: AIModel[];
}

export const AI_PROVIDERS: Record<string, AIProvider> = {
  openai: {
    label: 'OpenAI',
    models: [
      { value: 'gpt-5-2025-08-07', label: 'GPT-5', free: false },
      { value: 'gpt-5-mini-2025-08-07', label: 'GPT-5 Mini', free: false },
      { value: 'gpt-5-nano-2025-08-07', label: 'GPT-5 Nano', free: false },
      { value: 'gpt-4.1-2025-04-14', label: 'GPT-4.1', free: false },
      { value: 'o3-2025-04-16', label: 'O3', free: false },
      { value: 'o4-mini-2025-04-16', label: 'O4 Mini', free: false },
    ],
  },
  anthropic: {
    label: 'Anthropic (Claude)',
    models: [
      { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5', free: false },
      { value: 'claude-opus-4-1-20250805', label: 'Claude Opus 4.1', free: false },
      { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4', free: false },
      { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku', free: false },
    ],
  },
  google: {
    label: 'Google AI',
    models: [
      { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', free: true },
      { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', free: true },
      { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', free: true },
    ],
  },
  lovable: {
    label: 'Lovable AI Gateway',
    models: [
      { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash', free: true },
      { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro', free: true },
      { value: 'google/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', free: true },
      { value: 'openai/gpt-5', label: 'GPT-5', free: false },
      { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini', free: false },
      { value: 'openai/gpt-5-nano', label: 'GPT-5 Nano', free: false },
    ],
  },
  mistral: {
    label: 'Mistral AI',
    models: [
      { value: 'mistral-large-2411', label: 'Mistral Large', free: false },
      { value: 'mistral-small-2409', label: 'Mistral Small', free: false },
    ],
  },
  perplexity: {
    label: 'Perplexity',
    models: [
      { value: 'llama-3.1-sonar-large-128k-online', label: 'Llama 3.1 Sonar Large', free: false },
      { value: 'llama-3.1-sonar-small-128k-online', label: 'Llama 3.1 Sonar Small', free: false },
    ],
  },
  cohere: {
    label: 'Cohere',
    models: [
      { value: 'command-r-plus', label: 'Command R+', free: false },
      { value: 'command-r', label: 'Command R', free: false },
    ],
  },
};

export const getProviderLabel = (provider: string): string => {
  return AI_PROVIDERS[provider]?.label || provider.charAt(0).toUpperCase() + provider.slice(1);
};

export const getModelLabel = (provider: string, modelValue: string): string => {
  const models = AI_PROVIDERS[provider]?.models || [];
  return models.find(m => m.value === modelValue)?.label || modelValue;
};

export const isModelFree = (provider: string, modelValue: string): boolean => {
  const models = AI_PROVIDERS[provider]?.models || [];
  return models.find(m => m.value === modelValue)?.free || false;
};
