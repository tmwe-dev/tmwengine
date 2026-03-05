/**
 * ============ GEMINI PROVIDER ============
 */
import { fetchWithTimeout, withRetry } from './utils.ts';
import { AICallParams, AICallResult } from './ai-provider-types.ts';

export async function callGemini(
  params: AICallParams & { lovableApiKey: string }
): Promise<AICallResult> {
  const { conversationHistory, lovableApiKey, startTime } = params;

  const result = await withRetry(async () => {
    const response = await fetchWithTimeout('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableApiKey}`
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        max_tokens: 200,
        temperature: 0.7,
        messages: conversationHistory
      })
    }, 43000);

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 429) throw new Error('429');
      if (response.status === 402) throw new Error('Payment Required');
      if (response.status >= 500) throw new Error('5xx');
      throw new Error(`Lovable AI error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return {
      content: data.choices?.[0]?.message?.content?.trim() || '[ERRORE: Gemini ha ritornato content vuoto]',
      tokensIn: data.usage?.prompt_tokens || 0,
      tokensOut: data.usage?.completion_tokens || 0,
      duration: Date.now() - startTime
    };
  }, { retries: 3, baseDelayMs: 500 });

  return result;
}
