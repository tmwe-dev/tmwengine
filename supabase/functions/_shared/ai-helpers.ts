/**
 * AI Helpers - Módulo Compartido
 * Funciones reutilizables para procesamiento AI de emails
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// ============================================
// INTERFACES
// ============================================

export interface AIConfig {
  id: string;
  provider: string;
  modello: string;
  api_key: string;
  attivo: boolean;
}

export interface AIClassificationResult {
  category?: string;
  confidence?: number;
  summary?: string;
  keywords?: string[];
  priority?: string;
  requires_action?: boolean;
  suggested_actions?: string[];
}

export interface EmailData {
  id: string;
  subject: string;
  body_text: string;
  from_email: string;
  user_email: string;
  cartella?: string;
}

// ============================================
// GET AI CONFIG
// ============================================

export async function getAIConfig(
  supabase: SupabaseClient,
  selectedAgent: string = 'gemini'
): Promise<AIConfig> {
  console.log('[getAIConfig] 🤖 Loading AI config for agent:', selectedAgent);
  
  // Mappa agent → provider
  const agentToProviderMap: Record<string, string> = {
    'gpt': 'openai',
    'gemini': 'google',
    'claude': 'anthropic'
  };

  const targetProvider = agentToProviderMap[selectedAgent] || 'google';
  console.log('[getAIConfig] Provider:', targetProvider);

  // Get active config for provider
  const { data: configData, error: configError } = await supabase
    .from('config_ai')
    .select('*')
    .eq('attivo', true)
    .eq('provider', targetProvider)
    .maybeSingle();

  if (configError || !configData) {
    console.warn(`[getAIConfig] ⚠️ Config ${targetProvider} not available, falling back to Gemini`);
    
    // Fallback to Gemini
    const { data: fallbackConfig } = await supabase
      .from('config_ai')
      .select('*')
      .eq('attivo', true)
      .eq('provider', 'google')
      .maybeSingle();

    if (!fallbackConfig) {
      throw new Error('No active AI configuration found');
    }

    return fallbackConfig as AIConfig;
  }

  return configData as AIConfig;
}

// ============================================
// BUILD PROMPT
// ============================================

export async function buildPrompt(
  supabase: SupabaseClient,
  email: EmailData,
  operation: 'classify' | 'automate',
  options: {
    additionalInstructions?: string;
    forceCategory?: string;
    selectedAgent?: string;
  } = {}
): Promise<{ systemPrompt: string; userPrompt: string }> {
  console.log('[buildPrompt] 📝 Building prompt for operation:', operation);

  let systemPrompt = '';
  let userPrompt = '';

  if (operation === 'classify') {
    // Classification prompt
    systemPrompt = `Sei un assistente AI specializzato nella classificazione di email per un'azienda di trasporti/corrieri internazionali.

Analizza l'email e classifica in UNA di queste categorie:
1. Fatture - Fatture commerciali, invoice, richieste pagamento
2. Bolle / Packing List - Liste di imballaggio, packing list, documenti di trasporto
3. Preventivi / Quotazioni - Richieste di preventivo, quotazioni commerciali, offerte
4. Rate Aeree / Rate Navali - Tariffe di trasporto aereo/marittimo, rate shipping
5. Documenti Spedizione - Bill of Lading, AWB, documenti doganali, certificati
6. Offerte di Lavoro - Recruiting, posizioni aperte, candidature
7. Marketing / Pubblicità - Newsletter, promozioni, advertising
8. Spam / Non Rilevante - Email spam, irrilevanti, non classificabili

Genera anche un breve riassunto (max 200 caratteri) e 3-5 parole chiave significative.`;

    // Add custom instructions if provided
    if (options.additionalInstructions) {
      systemPrompt += `\n\n--- ISTRUZIONI ADDIZIONALI ---\n${options.additionalInstructions}`;
    }

    // Check for sender-specific prompt
    if (email.from_email) {
      const { data: promptData } = await supabase
        .from('email_sender_ai_prompts')
        .select('custom_prompt_additions')
        .eq('sender_email', email.from_email)
        .eq('is_active', true)
        .single();
      
      if (promptData?.custom_prompt_additions) {
        systemPrompt += `\n\n--- ISTRUZIONI PER QUESTO MITTENTE ---\n${promptData.custom_prompt_additions}`;
      }
    }

    userPrompt = `Email da classificare:
Oggetto: ${email.subject}
Mittente: ${email.from_email}
Corpo: ${(email.body_text || '').substring(0, 1500)}

Classifica questa email fornendo categoria, confidence (0-1), riassunto breve e keywords.`;

  } else if (operation === 'automate') {
    // Automation prompt
    const { data: promptConfig } = await supabase
      .from('email_sender_ai_prompts')
      .select(`
        *,
        prompt_library:prompt_library_id (
          system_prompt,
          default_actions,
          requires_email_templates,
          requires_contact_aliases,
          requires_company_data,
          suggested_temperature,
          suggested_max_tokens
        )
      `)
      .eq('sender_email', email.from_email)
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (promptConfig) {
      systemPrompt = promptConfig.prompt_library?.system_prompt || promptConfig.ai_prompt || '';
      
      if (promptConfig.custom_prompt_additions) {
        systemPrompt += `\n\n--- ISTRUZIONI ADDIZIONALI ---\n${promptConfig.custom_prompt_additions}`;
      }
    } else {
      systemPrompt = 'Sei un assistente AI che analizza email e suggerisce azioni.';
    }

    userPrompt = `Email da analizzare:
Oggetto: ${email.subject}
Mittente: ${email.from_email}
Corpo: ${(email.body_text || '').substring(0, 1000)}

Analizza questa email e suggerisci azioni appropriate.`;
  }

  return { systemPrompt, userPrompt };
}

// ============================================
// CALL AI PROVIDER
// ============================================

export async function callAIProvider(
  config: AIConfig,
  systemPrompt: string,
  userPrompt: string,
  tools?: any[]
): Promise<any> {
  console.log('[callAIProvider] 🤖 Calling AI provider:', config.provider);

  let endpoint = '';
  let model = config.modello;
  let requestBody: any = {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]
  };

  // Configure per provider
  if (config.provider === 'openai') {
    endpoint = 'https://api.openai.com/v1/chat/completions';
    requestBody.model = model || 'gpt-4';
    requestBody.temperature = 0.7;
    requestBody.max_tokens = 1500;
  } else if (config.provider === 'google') {
    endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';
    requestBody = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: systemPrompt + '\n\n' + userPrompt }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1500
      }
    };
  } else if (config.provider === 'anthropic') {
    endpoint = 'https://api.anthropic.com/v1/messages';
    requestBody.model = model || 'claude-3-5-sonnet-20241022';
    requestBody.system = systemPrompt;
    requestBody.messages = [{ role: 'user', content: userPrompt }];
    requestBody.max_tokens = 1500;
  }

  // Add tools if provided
  if (tools && tools.length > 0) {
    requestBody.tools = tools;
    requestBody.tool_choice = { type: 'function', function: { name: tools[0].function.name } };
  }

  // Make API call
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (config.provider === 'google') {
    endpoint = `${endpoint}?key=${config.api_key}`;
  } else {
    headers['Authorization'] = `Bearer ${config.api_key}`;
  }

  if (config.provider === 'anthropic') {
    headers['anthropic-version'] = '2023-06-01';
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API call failed: ${response.statusText} - ${errorText}`);
  }

  return await response.json();
}

// ============================================
// PARSE AI RESPONSE
// ============================================

export async function parseAIResponse(
  response: any,
  provider: string,
  operation: 'classify' | 'automate'
): Promise<AIClassificationResult> {
  console.log('[parseAIResponse] 📊 Parsing AI response for provider:', provider);

  let result: AIClassificationResult = {};

  if (provider === 'openai') {
    const message = response.choices?.[0]?.message;
    if (message?.tool_calls?.[0]) {
      const toolCall = message.tool_calls[0];
      const args = JSON.parse(toolCall.function.arguments);
      result = args;
    } else if (message?.content) {
      // Try to parse JSON from content
      try {
        result = JSON.parse(message.content);
      } catch {
        result = { summary: message.content };
      }
    }
  } else if (provider === 'google') {
    const content = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (content) {
      try {
        result = JSON.parse(content);
      } catch {
        result = { summary: content };
      }
    }
  } else if (provider === 'anthropic') {
    const content = response.content?.[0];
    if (content?.type === 'tool_use') {
      result = content.input;
    } else if (content?.text) {
      try {
        result = JSON.parse(content.text);
      } catch {
        result = { summary: content.text };
      }
    }
  }

  return result;
}

// ============================================
// UPDATE EMAIL CLASSIFICATION
// ============================================

export async function updateEmailClassification(
  supabase: SupabaseClient,
  emailId: string,
  classification: AIClassificationResult
): Promise<void> {
  console.log('[updateEmailClassification] 💾 Updating email classification');

  const { error } = await supabase
    .from('email_messages')
    .update({
      ai_category: classification.category,
      ai_summary: classification.summary,
      ai_keywords: classification.keywords,
      ai_confidence: classification.confidence,
      ai_priority: classification.priority,
      ai_requires_action: classification.requires_action,
      ai_suggested_actions: classification.suggested_actions,
      ai_processed_at: new Date().toISOString()
    })
    .eq('id', emailId);

  if (error) {
    console.error('[updateEmailClassification] ❌ Error updating:', error);
    throw error;
  }

  console.log('[updateEmailClassification] ✅ Classification updated');
}

// ============================================
// EXTRACT ENTITIES (PROMPT 3)
// ============================================

export interface ExtractedEntity {
  type: 'tracking' | 'invoice' | 'order' | 'date' | 'amount' | 'person' | 'company';
  value: string;
  confidence: number;
  context?: string;
}

export async function extractEntities(
  supabase: SupabaseClient,
  email: EmailData,
  aiConfig: AIConfig
): Promise<ExtractedEntity[]> {
  console.log('[extractEntities] 🔍 Extracting entities from email');

  const systemPrompt = `Sei un esperto nell'estrazione di entità da email.
Analizza il contenuto ed estrai:
- Tracking numbers (AWB, Order #, Invoice #, Shipment #)
- Date (scadenze, delivery, meeting)
- Importi (€, $, USD, EUR)
- Nomi di persone e aziende

Rispondi SOLO con JSON valido.`;

  const userPrompt = `Email da analizzare:

From: ${email.from_email}
Subject: ${email.subject}
Body: ${email.body_text}

Estrai tutte le entità rilevanti con confidence > 0.7`;

  const tools = [{
    type: "function",
    function: {
      name: "extract_entities",
      description: "Extract entities from email content",
      parameters: {
        type: "object",
        properties: {
          entities: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: {
                  type: "string",
                  enum: ["tracking", "invoice", "order", "date", "amount", "person", "company"]
                },
                value: { type: "string" },
                confidence: { type: "number", minimum: 0, maximum: 1 },
                context: { type: "string" }
              },
              required: ["type", "value", "confidence"]
            }
          }
        },
        required: ["entities"]
      }
    }
  }];

  const response = await callAIProvider(aiConfig, systemPrompt, userPrompt, tools);
  const parsed = await parseAIResponse(response, aiConfig.provider, 'classify');
  
  return (parsed as any).entities || [];
}

// ============================================
// CREATE OR UPDATE TOPIC
// ============================================

export async function createOrUpdateTopic(
  supabase: SupabaseClient,
  entity: ExtractedEntity,
  userId: string,
  emailId: string
): Promise<void> {
  console.log('[createOrUpdateTopic] 📌 Creating/updating topic:', entity.value);

  // Check if topic exists
  const { data: existing } = await supabase
    .from('email_topics')
    .select('*')
    .eq('user_id', userId)
    .eq('reference_number', entity.value)
    .maybeSingle();

  if (existing) {
    // Update existing topic
    await supabase
      .from('email_topics')
      .update({
        last_mentioned_at: new Date().toISOString(),
        email_count: existing.email_count + 1
      })
      .eq('id', existing.id);

    // Link email to topic
    await supabase
      .from('email_messages_topics')
      .insert({
        email_id: emailId,
        topic_id: existing.id
      })
      .onConflict('email_id,topic_id')
      .merge();
  } else {
    // Create new topic
    const { data: newTopic } = await supabase
      .from('email_topics')
      .insert({
        user_id: userId,
        topic_name: entity.value,
        topic_type: entity.type === 'tracking' || entity.type === 'invoice' || entity.type === 'order' ? entity.type : 'generic',
        reference_number: entity.value,
        metadata: { context: entity.context, confidence: entity.confidence }
      })
      .select()
      .single();

    if (newTopic) {
      // Link email to new topic
      await supabase
        .from('email_messages_topics')
        .insert({
          email_id: emailId,
          topic_id: newTopic.id
        });
    }
  }

  console.log('[createOrUpdateTopic] ✅ Topic updated');
}

// ============================================
// UPDATE CONVERSATION HISTORY
// ============================================

export async function updateConversationHistory(
  supabase: SupabaseClient,
  data: {
    user_id: string;
    sender_email: string;
    email_subject: string;
    email_summary: string;
    email_date: string;
  }
): Promise<void> {
  console.log('[updateConversationHistory] 💬 Updating conversation history for:', data.sender_email);

  const { data: existing } = await supabase
    .from('conversation_history')
    .select('*')
    .eq('user_id', data.user_id)
    .eq('sender_email', data.sender_email)
    .maybeSingle();

  const newExchange = {
    date: data.email_date,
    subject: data.email_subject,
    summary: data.email_summary
  };

  const last5 = existing
    ? [...(existing.last_5_exchanges || []), newExchange].slice(-5)
    : [newExchange];

  await supabase
    .from('conversation_history')
    .upsert({
      user_id: data.user_id,
      sender_email: data.sender_email,
      last_5_exchanges: last5,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,sender_email'
    });

  console.log('[updateConversationHistory] ✅ Conversation history updated');
}

// ============================================
// DECIDE ACTION (PROMPT 6)
// ============================================

export interface AIActionDecision {
  action: 'reply' | 'forward' | 'archive' | 'delete' | 'create_task' | 'nothing';
  reasoning: string;
  confidence: number;
  payload: any;
  suggested_response?: string;
}

export async function decideAction(
  supabase: SupabaseClient,
  email: EmailData,
  classification: AIClassificationResult,
  conversationHistory: any[],
  aiConfig: AIConfig
): Promise<AIActionDecision> {
  console.log('[decideAction] 🎯 Deciding action for email');

  const systemPrompt = `Sei un assistente email intelligente. Analizza l'email e decidi l'azione migliore.

Azioni disponibili:
1. reply - Rispondere all'email
2. forward - Inoltrare a collega
3. archive - Archiviare (già gestita)
4. delete - Eliminare (spam/irrilevante)
5. create_task - Creare attività
6. nothing - Nessuna azione necessaria

REGOLE:
- Se l'email richiede una risposta urgente → reply
- Se è una notifica già gestita → archive
- Se è spam evidente → delete
- Se richiede follow-up → create_task
- Spiega SEMPRE il tuo ragionamento`;

  const userPrompt = `Email da analizzare:

From: ${email.from_email}
Subject: ${email.subject}
Body: ${email.body_text}

CONTEXT:
- Categoria: ${classification.category}
- Priority: ${classification.priority}
- Summary: ${classification.summary}
- Conversazioni precedenti: ${conversationHistory.length > 0 ? JSON.stringify(conversationHistory) : 'Nessuna'}

Decidi l'azione migliore con reasoning dettagliato.`;

  const tools = [{
    type: "function",
    function: {
      name: "decide_action",
      description: "Decide the best action for this email",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["reply", "forward", "archive", "delete", "create_task", "nothing"]
          },
          reasoning: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          payload: { type: "object" },
          suggested_response: { type: "string" }
        },
        required: ["action", "reasoning", "confidence", "payload"]
      }
    }
  }];

  const response = await callAIProvider(aiConfig, systemPrompt, userPrompt, tools);
  const parsed = await parseAIResponse(response, aiConfig.provider, 'automate');
  
  console.log('[decideAction] ✅ Action decided:', (parsed as any).action);
  
  return parsed as AIActionDecision;
}
