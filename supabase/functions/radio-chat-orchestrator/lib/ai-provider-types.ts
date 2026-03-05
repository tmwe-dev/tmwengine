/**
 * ============ AI PROVIDER TYPES ============
 * Shared interfaces for all AI providers
 */

export interface AICallParams {
  conversationHistory: any[];
  startTime: number;
  maxTokens?: number;
}

export interface AICallResult {
  content: string;
  tokensIn: number;
  tokensOut: number;
  duration: number;
}
