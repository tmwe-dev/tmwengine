/**
 * ============ AI PROVIDERS (Albert Advisor) ============
 * Handles API calls to Claude, ChatGPT, and Gemini WITH TOOLS SUPPORT
 */

import { fetchWithTimeout, withRetry, collapseConsecutiveMessages } from './utils.ts';

export interface AICallParams {
  conversationHistory: any[];
  startTime: number;
  tools?: any[]; // ✅ ALBERT: Support for tools
}

export interface AICallResult {
  content: string;
  tokensIn: number;
  tokensOut: number;
  duration: number;
  toolCalls?: Array<{ // ✅ ALBERT: Return tool calls
    name: string;
    arguments: any;
  }>;
}

/**
 * Call Anthropic Claude API WITH TOOLS
 */
export async function callClaude(
  params: AICallParams & { apiKey: string }
): Promise<AICallResult> {
  const { conversationHistory, apiKey, startTime, tools } = params;
  
  console.log('🤖 Calling Anthropic (Claude) with tools...');
  
  const result = await withRetry(async () => {
    const systemMessages = conversationHistory.filter(m => m.role === 'system');
    const rawMessages = conversationHistory.filter(m => m.role !== 'system');
    const userMessages = collapseConsecutiveMessages(rawMessages);
    
    console.log(`🔧 Claude: ${rawMessages.length} messaggi → ${userMessages.length} collassati`);
    
    const fullSystemPrompt = systemMessages.map(m => m.content).join('\n\n---\n\n');
    
    const body: any = {
      model: 'claude-sonnet-4-5',
      max_tokens: 200,
      temperature: 0.7,
      messages: userMessages,
      system: fullSystemPrompt
    };
    
    // ✅ ALBERT: Add tools if provided
    if (tools && tools.length > 0) {
      body.tools = tools;
      console.log(`🔧 Claude riceve ${tools.length} tools`);
    }
    
    const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    }, 43000);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Anthropic error ${response.status}:`, errorText);
      
      if (response.status === 429) throw new Error('429');
      if (response.status >= 500) throw new Error('5xx');
      throw new Error(`Anthropic API error ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    
    // ✅ ALBERT: Extract text content
    const textContent = data.content
      ?.filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('\n') || '[ERRORE: Claude ha ritornato content vuoto]';
    
    // ✅ ALBERT: Extract tool calls
    const toolCalls = data.content
      ?.filter((block: any) => block.type === 'tool_use')
      .map((block: any) => ({
        name: block.name,
        arguments: block.input
      })) || [];
    
    console.log(`✅ Claude: ${toolCalls.length} tool calls estratti`);
    
    return {
      content: textContent.trim(),
      tokensIn: data.usage?.input_tokens || 0,
      tokensOut: data.usage?.output_tokens || 0,
      duration: Date.now() - startTime,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined
    };
  }, { retries: 2, baseDelayMs: 300 });
  
  console.log(`✅ Claude: ${result.tokensOut} token out (${result.tokensIn} in) in ${result.duration}ms`);
  return result;
}

/**
 * Call OpenAI ChatGPT via Lovable AI Gateway (priority) or direct API WITH TOOLS
 */
export async function callChatGPT(
  params: AICallParams & { 
    lovableApiKey: string | null;
    openaiConfig: any;
  }
): Promise<AICallResult> {
  const { conversationHistory, lovableApiKey, openaiConfig, startTime, tools } = params;
  
  if (lovableApiKey) {
    console.log('🤖 Calling OpenAI GPT-5 via Lovable AI Gateway with tools...');
    
    const requestPayload: any = {
      model: 'openai/gpt-5-mini',
      max_completion_tokens: 4000,
      reasoning_effort: 'low',
      messages: conversationHistory
    };
    
    // ✅ ALBERT: Add tools if provided
    if (tools && tools.length > 0) {
      requestPayload.tools = tools;
      console.log(`🔧 GPT-5 riceve ${tools.length} tools`);
    }

    console.log('📤 Request to Lovable AI:', {
      url: 'https://ai.gateway.lovable.dev/v1/chat/completions',
      model: requestPayload.model,
      max_completion_tokens: requestPayload.max_completion_tokens,
      messages_count: conversationHistory.length,
      has_auth: !!lovableApiKey,
      tools_count: tools?.length || 0
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
      
      if (data.usage?.completion_tokens_details?.reasoning_tokens > 0) {
        console.log(`🧠 GPT-5 ha usato ${data.usage.completion_tokens_details.reasoning_tokens} reasoning tokens`);
        
        const rawContent = data.choices?.[0]?.message?.content || '';
        if (!rawContent || rawContent.trim().length === 0) {
          console.error('❌ GPT-5 ha usato solo reasoning tokens senza emettere content finale!');
          return {
            content: '[ERRORE: GPT-5 ha esaurito i token durante il ragionamento. Riprova o aumenta max_completion_tokens.]',
            tokensIn: data.usage?.prompt_tokens || 0,
            tokensOut: data.usage?.completion_tokens || 0,
            duration: Date.now() - startTime
          };
        }
      }
      
      const contentPaths = {
        standard: data.choices?.[0]?.message?.content,
        delta: data.choices?.[0]?.delta?.content,
        text: data.choices?.[0]?.text,
        flat: data.content,
        message_text: data.choices?.[0]?.message?.text,
        output: data.output
      };

      const content = Object.values(contentPaths).find(v => v && typeof v === 'string' && v.trim().length > 0) || '';

      // ✅ ALBERT: Extract tool calls
      const toolCalls = data.choices?.[0]?.message?.tool_calls?.map((tc: any) => ({
        name: tc.function?.name,
        arguments: typeof tc.function?.arguments === 'string' 
          ? JSON.parse(tc.function.arguments) 
          : tc.function?.arguments
      })) || [];
      
      console.log(`✅ GPT-5: ${toolCalls.length} tool calls estratti`);
      
      return {
        content: content.trim() || '[ERRORE: GPT-5 ha ritornato content vuoto]',
        tokensIn: data.usage?.prompt_tokens || 0,
        tokensOut: data.usage?.completion_tokens || 0,
        duration: Date.now() - startTime,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined
      };
    }, { retries: 2, baseDelayMs: 300 });
    
    console.log(`✅ GPT-5 via Lovable: ${result.tokensOut} token out (${result.tokensIn} in) in ${result.duration}ms`);
    return result;
  }
  
  // Fallback: Direct OpenAI API
  if (openaiConfig?.api_key) {
    console.log('⚠️ Fallback: Calling OpenAI direct API with tools...');
    
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
        body.max_completion_tokens = 200;
      } else {
        body.max_tokens = 200;
        body.temperature = 0.7;
      }
      
      // ✅ ALBERT: Add tools if provided
      if (tools && tools.length > 0) {
        body.tools = tools;
        console.log(`🔧 GPT (direct) riceve ${tools.length} tools`);
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
      
      // ✅ ALBERT: Extract tool calls
      const toolCalls = data.choices?.[0]?.message?.tool_calls?.map((tc: any) => ({
        name: tc.function?.name,
        arguments: typeof tc.function?.arguments === 'string' 
          ? JSON.parse(tc.function.arguments) 
          : tc.function?.arguments
      })) || [];
      
      console.log(`✅ GPT (direct): ${toolCalls.length} tool calls estratti`);
      
      return {
        content: data.choices?.[0]?.message?.content?.trim() || '[ERRORE: ChatGPT ha ritornato content vuoto]',
        tokensIn: data.usage?.prompt_tokens || 0,
        tokensOut: data.usage?.completion_tokens || 0,
        duration: Date.now() - startTime,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined
      };
    }, { retries: 2, baseDelayMs: 300 });
    
    console.log(`✅ ChatGPT: ${result.tokensOut} token out (${result.tokensIn} in) in ${result.duration}ms`);
    return result;
  }
  
  throw new Error('Nessuna chiave API disponibile per OpenAI');
}

/**
 * Call Google Gemini via Lovable AI Gateway WITH TOOLS
 */
export async function callGemini(
  params: AICallParams & { lovableApiKey: string }
): Promise<AICallResult> {
  const { conversationHistory, lovableApiKey, startTime, tools } = params;
  
  console.log('🤖 Calling Lovable AI (Gemini) with tools...');
  
  const result = await withRetry(async () => {
    const requestPayload: any = {
      model: 'google/gemini-2.5-flash',
      max_tokens: 200,
      temperature: 0.7,
      messages: conversationHistory
    };
    
    // ✅ ALBERT: Add tools if provided
    if (tools && tools.length > 0) {
      requestPayload.tools = tools;
      console.log(`🔧 Gemini riceve ${tools.length} tools`);
    }
    
    const response = await fetchWithTimeout('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableApiKey}`
      },
      body: JSON.stringify(requestPayload)
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
    
    // ✅ ALBERT: Extract tool calls
    const toolCalls = data.choices?.[0]?.message?.tool_calls?.map((tc: any) => ({
      name: tc.function?.name,
      arguments: typeof tc.function?.arguments === 'string' 
        ? JSON.parse(tc.function.arguments) 
        : tc.function?.arguments
    })) || [];
    
    console.log(`✅ Gemini: ${toolCalls.length} tool calls estratti`);
    
    return {
      content: data.choices?.[0]?.message?.content?.trim() || '[ERRORE: Gemini ha ritornato content vuoto]',
      tokensIn: data.usage?.prompt_tokens || 0,
      tokensOut: data.usage?.completion_tokens || 0,
      duration: Date.now() - startTime,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined
    };
  }, { retries: 3, baseDelayMs: 500 });
  
  console.log(`✅ Gemini: ${result.tokensOut} token out (${result.tokensIn} in) in ${result.duration}ms`);
  return result;
}