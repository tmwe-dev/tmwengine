/**
 * ============ CHATGPT PROVIDER ============
 */
import { fetchWithTimeout, withRetry, collapseConsecutiveMessages } from './utils.ts';
import { AICallParams, AICallResult } from './ai-provider-types.ts';

export async function callChatGPT(
  params: AICallParams & { lovableApiKey: string | null; openaiConfig: any }
): Promise<AICallResult> {
  const { conversationHistory, lovableApiKey, openaiConfig, startTime } = params;

  // Priority: Use Lovable AI Gateway
  if (lovableApiKey) {
    const result = await withRetry(async () => {
      const response = await fetchWithTimeout('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${lovableApiKey}`
        },
        body: JSON.stringify({
          model: 'openai/gpt-5-mini',
          max_completion_tokens: 1200,
          reasoning_effort: 'low',
          messages: conversationHistory
        })
      }, 60000);

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 429) throw new Error('429');
        if (response.status === 402) throw new Error('Payment Required');
        if (response.status >= 500) throw new Error('5xx');
        throw new Error(`Lovable AI error ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      // Multi-path content extraction
      const content = data.choices?.[0]?.message?.content
        || data.choices?.[0]?.delta?.content
        || data.choices?.[0]?.text
        || data.content
        || '';

      return {
        content: (typeof content === 'string' ? content.trim() : '') || '[ERRORE: GPT-5 ha ritornato content vuoto]',
        tokensIn: data.usage?.prompt_tokens || 0,
        tokensOut: data.usage?.completion_tokens || 0,
        duration: Date.now() - startTime
      };
    }, { retries: 2, baseDelayMs: 300 });

    return result;
  }

  // Fallback: Direct OpenAI API
  if (openaiConfig?.api_key) {
    const modelName = openaiConfig.modello || 'gpt-5-2025-08-07';
    const isNewerModel = modelName.startsWith('gpt-5') || modelName.startsWith('o3') || modelName.startsWith('o4');

    const result = await withRetry(async () => {
      const rawMessages = conversationHistory.map((msg: any) => ({
        role: msg.role === 'human' ? 'user' : msg.role,
        content: msg.content
      }));

      const systemMsgs = rawMessages.filter((m: any) => m.role === 'system');
      const nonSystemMsgs = rawMessages.filter((m: any) => m.role !== 'system');
      const messages = [...systemMsgs, ...collapseConsecutiveMessages(nonSystemMsgs)];

      const body: any = { model: modelName, messages };
      if (isNewerModel) {
        body.max_completion_tokens = 200;
      } else {
        body.max_tokens = 200;
        body.temperature = 0.7;
      }

      const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiConfig.api_key}`
        },
        body: JSON.stringify(body)
      }, 60000);

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 429) throw new Error('429');
        if (response.status >= 500) throw new Error('5xx');
        throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return {
        content: data.choices?.[0]?.message?.content?.trim() || '[ERRORE: ChatGPT ha ritornato content vuoto]',
        tokensIn: data.usage?.prompt_tokens || 0,
        tokensOut: data.usage?.completion_tokens || 0,
        duration: Date.now() - startTime
      };
    }, { retries: 2, baseDelayMs: 300 });

    return result;
  }

  throw new Error('Nessuna chiave API disponibile per OpenAI');
}
