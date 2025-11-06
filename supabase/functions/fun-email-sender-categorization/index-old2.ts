import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailSample {
  subject: string;
  body_preview: string;
  date: string;
}

interface ExistingGroup {
  id: string;
  name: string;
  type: string;
  color?: string;
  icon?: string;
  description?: string;
}

interface SenderWithEmails {
  email: string;
  email_samples: EmailSample[];
}

interface CategorizationRequest {
  user_id: string;
  user_email: string;
  batch_id: string;
  model: string;
  existing_groups: ExistingGroup[];
  senders: SenderWithEmails[];
  max_emails_per_sender?: number;
  batch_start_index?: number;
  batch_size?: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user via Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: CategorizationRequest = await req.json();
    const { user_id, user_email, batch_id, existing_groups, senders, batch_start_index = 0, batch_size = 3 } = body;

    // Process only subset of senders
    const batchSenders = senders.slice(batch_start_index, batch_start_index + batch_size);
    
    console.log(`[AI Categorization] Processing batch ${batch_id}: ${batchSenders.length} senders (index ${batch_start_index}-${batch_start_index + batch_size} of ${senders.length})`);

    // ✅ NEW: Load AI configuration from DB (multi-provider support)
    const { data: aiConfig, error: configError } = await supabase
      .from('config_ai')
      .select('*')
      .eq('attivo', true)
      .order('provider', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (configError || !aiConfig) {
      throw new Error('No active AI configuration found. Please configure AI provider in settings.');
    }

    console.log(`🤖 Using AI config: ${aiConfig.provider}/${aiConfig.modello}`);

    // ✅ NEW: Load prompt from DB
    const { data: promptData } = await supabase
      .from('chat_laboratory_composed_prompts')
      .select('content')
      .eq('target_agent', 'email_sender_categorizer')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fallback to hardcoded prompt if not found
    const baseSystemPrompt = promptData?.content || `Sei un esperto di categorizzazione email business per PMI italiane.`;

    console.log(`📝 Prompt loaded: ${baseSystemPrompt.substring(0, 100)}...`);

    // ✅ NEW: Initialize or update progress tracking
    if (batch_start_index === 0) {
      await supabase
        .from('ai_categorization_progress')
        .insert({
          user_id,
          batch_id,
          processed_count: 0,
          total_count: senders.length,
          status: 'processing',
          last_processed_index: 0,
        });
    }

    // ✅ NEW: Process only batch subset with progress updates
    const suggestions: any[] = [];
    let processedCount = 0;

    for (const sender of batchSenders) {
      try {
        const result = await processSender(
          sender,
          existing_groups,
          baseSystemPrompt,
          aiConfig,
          supabase
        );
        suggestions.push({ status: 'fulfilled', value: result });
      } catch (error) {
        suggestions.push({ status: 'rejected', reason: error });
      }

      // Update progress with absolute index
      processedCount++;
      const absoluteProcessed = batch_start_index + processedCount;
      const isComplete = absoluteProcessed >= senders.length;
      
      await supabase
        .from('ai_categorization_progress')
        .update({
          processed_count: absoluteProcessed,
          last_processed_index: absoluteProcessed,
          status: isComplete ? 'completed' : 'processing',
          completed_at: isComplete ? new Date().toISOString() : null,
        })
        .eq('batch_id', batch_id);
    }

    // Separate successful and failed
    const successful = suggestions.filter((r) => r.status === 'fulfilled') as PromiseFulfilledResult<any>[];
    const failed = suggestions.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];

    console.log(`[AI Categorization] Batch ${batch_id} completed: ${successful.length} success, ${failed.length} failed`);

    // Calculate totals
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCostEur = 0;
    const isFreeModel = aiConfig.modello.includes('gemini-2.5-flash');

    const suggestionResults = [];

    for (const result of successful) {
      const data = result.value;
      totalInputTokens += data.tokens_input;
      totalOutputTokens += data.tokens_output;
      totalCostEur += data.cost_eur;

      // Save to database
      const { data: savedSuggestion, error: saveError } = await supabase
        .from('ai_categorization_suggestions')
        .insert({
          user_id,
          batch_id,
          sender_email: data.sender_email,
          suggested_group_id: data.suggested_group.id,
          suggested_group_name: data.suggested_group.name,
          suggested_group_type: data.suggested_group.type,
          suggested_group_color: data.suggested_group.color,
          suggested_group_icon: data.suggested_group.icon,
          is_new_group: data.suggested_group.is_new,
          confidence: data.confidence,
          reasoning: data.reasoning,
          model_used: `${aiConfig.provider}/${aiConfig.modello}`,
          tokens_input: data.tokens_input,
          tokens_output: data.tokens_output,
          cost_eur: data.cost_eur,
          status: 'pending',
        })
        .select()
        .single();

      if (saveError) {
        console.error('[AI Categorization] Error saving suggestion:', saveError);
        continue;
      }

      suggestionResults.push({
        id: savedSuggestion.id,
        sender_email: data.sender_email,
        suggested_group: data.suggested_group,
        confidence: data.confidence,
        reasoning: data.reasoning,
        cost: {
          tokens_input: data.tokens_input,
          tokens_output: data.tokens_output,
          eur: data.cost_eur,
          is_free: isFreeModel,
        },
      });
    }

    // Track batch cost
    await supabase.from('ai_cost_tracking').insert({
      user_id,
      batch_id,
      operation_type: 'email_categorization',
      model_used: `${aiConfig.provider}/${aiConfig.modello}`,
      provider: aiConfig.provider,
      input_tokens: totalInputTokens,
      output_tokens: totalOutputTokens,
      cost_input_eur: isFreeModel ? 0 : totalInputTokens * getCostPerToken(aiConfig.modello, 'input'),
      cost_output_eur: isFreeModel ? 0 : totalOutputTokens * getCostPerToken(aiConfig.modello, 'output'),
      cost_total_eur: totalCostEur,
      operation_metadata: {
        senders_count: senders.length,
        successful: successful.length,
        failed: failed.length,
        is_free: isFreeModel,
      },
    });

    const nextBatchStart = batch_start_index + batch_size;
    const isComplete = nextBatchStart >= senders.length;

    return new Response(
      JSON.stringify({
        success: true,
        batch_id,
        processed_count: batchSenders.length,
        remaining_count: Math.max(0, senders.length - nextBatchStart),
        next_batch_start: nextBatchStart,
        is_complete: isComplete,
        suggestions: suggestionResults,
        batch_summary: {
          current_batch: Math.floor(batch_start_index / batch_size) + 1,
          total_batches: Math.ceil(senders.length / batch_size),
          total_senders: senders.length,
          successful: successful.length,
          failed: failed.length,
          total_cost: {
            tokens: totalInputTokens + totalOutputTokens,
            eur: totalCostEur,
            is_free: isFreeModel,
          },
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[AI Categorization] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function processSender(
  sender: SenderWithEmails,
  existingGroups: ExistingGroup[],
  baseSystemPrompt: string,
  aiConfig: any,
  supabase: any
) {
  // Build dynamic system prompt with existing groups context
  const systemPrompt = `${baseSystemPrompt}

GRUPPI ESISTENTI:
${existingGroups.map((g) => `- ${g.name} (${g.type})${g.description ? ': ' + g.description : ''}`).join('\n')}`;

  const userPrompt = `MITTENTE: ${sender.email}

MESSAGGI RECENTI (${sender.email_samples.length}):
${sender.email_samples
    .map(
      (e, i) => `
━━━ EMAIL ${i + 1} ━━━
Data: ${e.date}
Oggetto: ${e.subject}
Anteprima: ${e.body_preview}
`
    )
    .join('\n')}

Analizza e categorizza questo mittente.`;

  console.log(`[AI Categorization] Processing ${sender.email} with ${aiConfig.provider}/${aiConfig.modello}`);

  // ✅ NEW: Tool definition for structured output
  const tools = [{
    type: 'function',
    function: {
      name: 'categorize_sender',
      description: 'Categorizza il mittente email in un gruppo esistente o nuovo',
      parameters: {
        type: 'object',
        properties: {
          suggested_group: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'UUID gruppo esistente o null se nuovo' },
              name: { type: 'string', description: 'Nome del gruppo' },
              type: { type: 'string', description: 'Tipo gruppo (clienti, fornitori, partner, ecc.)' },
              is_new: { type: 'boolean', description: 'True se è un nuovo gruppo da creare' },
              description: { type: 'string', description: 'Breve descrizione del gruppo' },
              color: { type: 'string', description: 'Colore hex suggerito per il gruppo (es: #3b82f6)' },
              icon: { type: 'string', description: 'Icona Lucide suggerita (es: Users, Package)' }
            },
            required: ['name', 'type', 'is_new']
          },
          confidence: { type: 'number', description: 'Confidenza 0.0-1.0', minimum: 0, maximum: 1 },
          reasoning: { type: 'string', description: 'Motivo della scelta (max 100 parole)' }
        },
        required: ['suggested_group', 'confidence', 'reasoning']
      }
    }
  }];

  // ✅ NEW: Multi-provider support
  let aiData;
  let usage: any;

  if (aiConfig.provider === 'lovable' || aiConfig.provider === 'google') {
    // Lovable AI Gateway (Gemini)
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) throw new Error('LOVABLE_API_KEY not configured');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: aiConfig.modello,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools,
        tool_choice: { type: 'function', function: { name: 'categorize_sender' } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Lovable AI error: ${response.status} - ${errorText}`);
    }

    aiData = await response.json();
    usage = aiData.usage;

  } else if (aiConfig.provider === 'openai') {
    const apiKey = aiConfig.api_key;
    if (!apiKey) throw new Error('OpenAI API key missing');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: aiConfig.modello,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools,
        tool_choice: { type: 'function', function: { name: 'categorize_sender' } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI error: ${response.status} - ${errorText}`);
    }

    aiData = await response.json();
    usage = aiData.usage;

  } else if (aiConfig.provider === 'anthropic') {
    const apiKey = aiConfig.api_key;
    if (!apiKey) throw new Error('Anthropic API key missing');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: aiConfig.modello,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        tools: tools.map(t => ({
          name: t.function.name,
          description: t.function.description,
          input_schema: t.function.parameters
        })),
        tool_choice: { type: 'tool', name: 'categorize_sender' }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic error: ${response.status} - ${errorText}`);
    }

    const claudeData = await response.json();
    const toolUse = claudeData.content?.find((c: any) => c.type === 'tool_use');
    if (!toolUse) throw new Error('No tool use in Claude response');

    aiData = {
      choices: [{
        message: {
          tool_calls: [{
            function: {
              name: toolUse.name,
              arguments: JSON.stringify(toolUse.input)
            }
          }]
        }
      }]
    };
    usage = { prompt_tokens: claudeData.usage?.input_tokens || 0, completion_tokens: claudeData.usage?.output_tokens || 0 };

  } else {
    throw new Error(`Unsupported provider: ${aiConfig.provider}`);
  }

  // Parse tool call result
  const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
  if (!toolCall) {
    throw new Error('No tool call in AI response');
  }

  let parsedResult;
  try {
    parsedResult = JSON.parse(toolCall.function.arguments);
  } catch {
    // Fallback if parsing fails
    parsedResult = {
      suggested_group: {
        id: null,
        name: 'Altro',
        type: 'altro',
        is_new: true,
      },
      confidence: 0.5,
      reasoning: 'Parsing error, auto-categorized',
    };
  }

  // Find existing group if id provided
  if (parsedResult.suggested_group.id) {
    const group = existingGroups.find((g) => g.id === parsedResult.suggested_group.id);
    if (group) {
      parsedResult.suggested_group.color = group.color;
      parsedResult.suggested_group.icon = group.icon;
      parsedResult.suggested_group.is_new = false;
    }
  }

  // Calculate cost
  const isFree = aiConfig.modello.includes('gemini-2.5-flash');
  const costEur = isFree
    ? 0
    : ((usage.prompt_tokens || 0) * getCostPerToken(aiConfig.modello, 'input') +
        (usage.completion_tokens || 0) * getCostPerToken(aiConfig.modello, 'output'));

  return {
    sender_email: sender.email,
    suggested_group: parsedResult.suggested_group,
    confidence: parsedResult.confidence,
    reasoning: parsedResult.reasoning,
    tokens_input: usage.prompt_tokens || 0,
    tokens_output: usage.completion_tokens || 0,
    cost_eur: costEur,
  };
}

function getCostPerToken(model: string, type: 'input' | 'output'): number {
  // Prices per 1M tokens in EUR
  const pricing: Record<string, { input: number; output: number }> = {
    'google/gemini-2.5-flash': { input: 0, output: 0 },
    'google/gemini-2.5-pro': { input: 0.125, output: 0.5 },
    'openai/gpt-5-mini': { input: 0.15, output: 0.6 },
    'openai/gpt-5': { input: 5.0, output: 15.0 },
  };

  const modelPricing = pricing[model] || pricing['google/gemini-2.5-flash'];
  return modelPricing[type] / 1_000_000;
}
