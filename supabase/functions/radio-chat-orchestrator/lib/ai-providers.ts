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
  params: AICallParams & { apiKey: string; model?: string }
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
        model: params.model || 'claude-sonnet-4-5-20250929',
        max_tokens: 200,
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
      
      // 🔥 Check specifico per crediti insufficienti
      if (response.status === 400 && errorText.includes('credit balance')) {
        throw new Error('INSUFFICIENT_CREDITS: Anthropic credits too low');
      }
      
      throw new Error(`Anthropic API error ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    return {
      content: data.content?.[0]?.text?.trim() || '[ERRORE: Claude ha ritornato content vuoto]',
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
    
    const requestPayload = {
      model: 'openai/gpt-5-mini',
      max_completion_tokens: 1200,
      reasoning_effort: 'low',  // 🔥 Riduce reasoning tokens da ~768 a ~200
      messages: conversationHistory
    };

    console.log('📤 Request to Lovable AI:', {
      url: 'https://ai.gateway.lovable.dev/v1/chat/completions',
      model: requestPayload.model,
      max_completion_tokens: requestPayload.max_completion_tokens,
      messages_count: conversationHistory.length,
      has_auth: !!lovableApiKey
    });
    
    const result = await withRetry(async () => {
      const response = await fetchWithTimeout('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${lovableApiKey}`
        },
        body: JSON.stringify(requestPayload)
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
      
      // 🔥 CHECK REASONING TOKENS (GPT-5)
      if (data.usage?.completion_tokens_details?.reasoning_tokens > 0) {
        console.log(`🧠 GPT-5 ha usato ${data.usage.completion_tokens_details.reasoning_tokens} reasoning tokens`);
        
        const rawContent = data.choices?.[0]?.message?.content || '';
        if (!rawContent || rawContent.trim().length === 0) {
          console.error('❌ GPT-5 ha usato solo reasoning tokens senza emettere content finale!');
          console.error('❌ Usage info:', data.usage);
          return {
            content: '[ERRORE: GPT-5 ha esaurito i token durante il ragionamento. Riprova o aumenta max_completion_tokens.]',
            tokensIn: data.usage?.prompt_tokens || 0,
            tokensOut: data.usage?.completion_tokens || 0,
            duration: Date.now() - startTime
          };
        }
      }
      
      // 🔥 Deep logging della risposta raw completa
      console.log('🔥 RAW GPT-5 Response:', JSON.stringify(data, null, 2));
      console.log('🔥 Response Top-Level Keys:', Object.keys(data));
      if (data.choices?.[0]) {
        console.log('🔥 Choices[0] Keys:', Object.keys(data.choices[0]));
        if (data.choices[0].message) {
          console.log('🔥 Message Keys:', Object.keys(data.choices[0].message));
        }
      }

      // 🔥 Multi-path content extraction - prova tutti i possibili formati
      const contentPaths = {
        standard: data.choices?.[0]?.message?.content,
        delta: data.choices?.[0]?.delta?.content,
        text: data.choices?.[0]?.text,
        flat: data.content,
        message_text: data.choices?.[0]?.message?.text,
        output: data.output
      };

      console.log('🔍 Content Paths Analysis:', {
        standard: !!contentPaths.standard,
        delta: !!contentPaths.delta,
        text: !!contentPaths.text,
        flat: !!contentPaths.flat,
        message_text: !!contentPaths.message_text,
        output: !!contentPaths.output,
        values_preview: Object.entries(contentPaths).map(([key, val]) => [key, typeof val, val?.substring?.(0, 50)])
      });

      // Trova il primo path non-vuoto
      const content = Object.values(contentPaths).find(v => v && typeof v === 'string' && v.trim().length > 0) || '';

      // 🔥 Character analysis se content esiste ma sembra vuoto
      if (content && content.trim().length === 0) {
        console.warn('⚠️ Content contiene solo whitespace:', {
          length: content.length,
          bytes: new TextEncoder().encode(content).length,
          charCodes: [...content].slice(0, 20).map(c => c.charCodeAt(0))
        });
      }

      // 🔥 Error completo se nessun content trovato
      if (!content) {
        console.error('❌ NESSUN CONTENT TROVATO! Struttura completa data:', JSON.stringify(data, null, 2));
        console.error('❌ Usage info:', data.usage);
      }

      console.log('📦 GPT-5 Final Content Debug:', {
        has_content: !!content,
        content_length: content?.length || 0,
        trimmed_length: content?.trim().length || 0,
        content_preview: content?.substring(0, 150),
        tokens_in: data.usage?.prompt_tokens,
        tokens_out: data.usage?.completion_tokens
      });
      
      return {
        content: content.trim() || '[ERRORE: GPT-5 ha ritornato content vuoto]',
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
        content: data.choices?.[0]?.message?.content?.trim() || '[ERRORE: ChatGPT ha ritornato content vuoto]',
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
        max_tokens: 200,
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
      content: data.choices?.[0]?.message?.content?.trim() || '[ERRORE: Gemini ha ritornato content vuoto]',
      tokensIn: data.usage?.prompt_tokens || 0,
      tokensOut: data.usage?.completion_tokens || 0,
      duration: Date.now() - startTime
    };
  }, { retries: 3, baseDelayMs: 500 });
  
  console.log(`✅ Gemini: ${result.tokensOut} token out (${result.tokensIn} in) in ${result.duration}ms`);
  return result;
}
