/**
 * ============ CLAUDE PROVIDER ============
 */
import { fetchWithTimeout, withRetry, collapseConsecutiveMessages } from './utils.ts';
import { AICallParams, AICallResult } from './ai-provider-types.ts';

export async function callClaude(
  params: AICallParams & { apiKey: string; model?: string }
): Promise<AICallResult> {
  const { conversationHistory, apiKey, startTime } = params;

  const result = await withRetry(async () => {
    const systemMessages = conversationHistory.filter((m: any) => m.role === 'system');
    const rawMessages = conversationHistory.filter((m: any) => m.role !== 'system');
    const userMessages = collapseConsecutiveMessages(rawMessages);
    const fullSystemPrompt = systemMessages.map((m: any) => m.content).join('\n\n---\n\n');

    const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: params.model || 'claude-sonnet-4-5-20250929',
        max_tokens: 800,
        temperature: 0.7,
        messages: userMessages,
        system: fullSystemPrompt
      })
    }, 43000);

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 429) throw new Error('429');
      if (response.status >= 500) throw new Error('5xx');
      if (response.status === 400 && errorText.includes('credit balance')) {
        throw new Error('INSUFFICIENT_CREDITS: Anthropic credits too low');
      }
      throw new Error(`Anthropic API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const rawContent = data.content?.[0]?.text?.trim();
    if (!rawContent) throw new Error('Claude returned empty content');

    return {
      content: rawContent,
      tokensIn: data.usage?.input_tokens || 0,
      tokensOut: data.usage?.output_tokens || 0,
      duration: Date.now() - startTime
    };
  }, { retries: 2, baseDelayMs: 300 });

  return result;
}
