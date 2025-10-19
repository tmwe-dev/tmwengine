/**
 * ============ AI PROVIDERS ============
 * Handles API calls to Claude, ChatGPT, and Gemini
 */

import { fetchWithTimeout, withRetry, collapseConsecutiveMessages } from './utils.ts';

export interface AICallParams {
  conversationHistory: any[];
  startTime: number;
}

export interface AICallResult {
  content: string;
  tokensIn: number;
  tokensOut: number;
  duration: number;
}

/**
 * Call Anthropic Claude API
 */
export async function callClaude(
  params: AICallParams & { apiKey: string }
): Promise<AICallResult> {
  const { conversationHistory, apiKey, startTime } = params;
  
  console.log('🤖 Calling Anthropic (Claude)...');
  
  const result = await withRetry(async () => {
    // Extract system messages
    const systemMessages = conversationHistory.filter(m => m.role === 'system');
    const rawMessages = conversationHistory.filter(m => m.role !== 'system');
    
    // Collapse consecutive messages
    const userMessages = collapseConsecutiveMessages(rawMessages);
    console.log(`🔧 Claude: ${rawMessages.length} messaggi → ${userMessages.length} collassati`);
    
    // Compose full system prompt
    const fullSystemPrompt = systemMessages.map(m => m.content).join('\n\n---\n\n');
    
    const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 200,  // 🎯 ~60-70 parole (100-150 tokens)
        temperature: 0.7,
        messages: userMessages,
        system: fullSystemPrompt
      })
    }, 43000);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Anthropic error ${response.status}:`, errorText);
      
      if (response.status === 429) throw new Error('429');
      if (response.status >= 500) throw new Error('5xx');
      throw new Error(`Anthropic API error ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    return {
      content: data.content[0].text,
      tokensIn: data.usage?.input_tokens || 0,
      tokensOut: data.usage?.output_tokens || 0,
      duration: Date.now() - startTime
    };
  }, { retries: 2, baseDelayMs: 300 });
  
  console.log(`✅ Claude: ${result.tokensOut} token out (${result.tokensIn} in) in ${result.duration}ms`);
  return result;
}

/**
 * Call OpenAI ChatGPT via Lovable AI Gateway (priority) or direct API
 */
export async function callChatGPT(
  params: AICallParams & { 
    lovableApiKey: string | null;
    openaiConfig: any;
  }
): Promise<AICallResult> {
  const { conversationHistory, lovableApiKey, openaiConfig, startTime } = params;
  
  // Priority: Use Lovable AI Gateway if available
  if (lovableApiKey) {
    console.log('🤖 Calling OpenAI GPT-5 via Lovable AI Gateway...');
    
    const result = await withRetry(async () => {
      const response = await fetchWithTimeout('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${lovableApiKey}`
        },
        body: JSON.stringify({
          model: 'openai/gpt-5-mini',
          max_completion_tokens: 200,  // 🎯 ~60-70 parole
          messages: conversationHistory
        })
      }, 60000);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Lovable AI (GPT-5) error ${response.status}:`, errorText);
        
        if (response.status === 429) throw new Error('429');
        if (response.status === 402) throw new Error('Payment Required');
        if (response.status >= 500) throw new Error('5xx');
        throw new Error(`Lovable AI error ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      return {
        content: data.choices[0].message.content,
        tokensIn: data.usage?.prompt_tokens || 0,
        tokensOut: data.usage?.completion_tokens || 0,
        duration: Date.now() - startTime
      };
    }, { retries: 2, baseDelayMs: 300 });
    
    console.log(`✅ GPT-5 via Lovable: ${result.tokensOut} token out (${result.tokensIn} in) in ${result.duration}ms`);
    return result;
  }
  
  // Fallback: Direct OpenAI API
  if (openaiConfig?.api_key) {
    console.log('⚠️ Fallback: Calling OpenAI direct API...');
    
    const modelName = openaiConfig.modello || 'gpt-5-2025-08-07';
    const isNewerModel = modelName.startsWith('gpt-5') || 
                        modelName.startsWith('o3') || 
                        modelName.startsWith('o4');
    
    console.log(`🎯 Modello: ${modelName} (${isNewerModel ? 'newer' : 'legacy'} parameters)`);
    
    const result = await withRetry(async () => {
      const rawMessages = conversationHistory.map(msg => {
        if (msg.role === 'system') return msg;
        return {
          role: msg.role === 'human' ? 'user' : msg.role,
          content: msg.content
        };
      });
      
      const systemMsgs = rawMessages.filter(m => m.role === 'system');
      const nonSystemMsgs = rawMessages.filter(m => m.role !== 'system');
      const collapsedMsgs = collapseConsecutiveMessages(nonSystemMsgs);
      const messages = [...systemMsgs, ...collapsedMsgs];
      
      console.log(`🔧 GPT: ${nonSystemMsgs.length} messaggi → ${collapsedMsgs.length} collassati`);
      
      const body: any = {
        model: modelName,
        messages: messages
      };
      
      if (isNewerModel) {
        body.max_completion_tokens = 200;  // 🎯 ~60-70 parole
      } else {
        body.max_tokens = 200;  // 🎯 ~60-70 parole
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
        console.error(`❌ OpenAI error ${response.status}:`, errorText);
        
        if (response.status === 429) throw new Error('429');
        if (response.status >= 500) throw new Error('5xx');
        throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      return {
        content: data.choices[0].message.content,
        tokensIn: data.usage?.prompt_tokens || 0,
        tokensOut: data.usage?.completion_tokens || 0,
        duration: Date.now() - startTime
      };
    }, { retries: 2, baseDelayMs: 300 });
    
    console.log(`✅ ChatGPT: ${result.tokensOut} token out (${result.tokensIn} in) in ${result.duration}ms`);
    return result;
  }
  
  throw new Error('Nessuna chiave API disponibile per OpenAI');
}

/**
 * Call Google Gemini via Lovable AI Gateway
 */
export async function callGemini(
  params: AICallParams & { lovableApiKey: string }
): Promise<AICallResult> {
  const { conversationHistory, lovableApiKey, startTime } = params;
  
  console.log('🤖 Calling Lovable AI (Gemini)...');
  
  const result = await withRetry(async () => {
    const response = await fetchWithTimeout('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableApiKey}`
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        max_tokens: 200,  // 🎯 ~60-70 parole
        temperature: 0.7,
        messages: conversationHistory
      })
    }, 43000);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Lovable AI error ${response.status}:`, errorText);
      
      if (response.status === 429) throw new Error('429');
      if (response.status === 402) throw new Error('Payment Required');
      if (response.status >= 500) throw new Error('5xx');
      throw new Error(`Lovable AI error ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      tokensIn: data.usage?.prompt_tokens || 0,
      tokensOut: data.usage?.completion_tokens || 0,
      duration: Date.now() - startTime
    };
  }, { retries: 2, baseDelayMs: 300 });
  
  console.log(`✅ Gemini: ${result.tokensOut} token out (${result.tokensIn} in) in ${result.duration}ms`);
  return result;
}
