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
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Verify user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: CategorizationRequest = await req.json();
    const { user_id, user_email, batch_id, model, existing_groups, senders } = body;

    console.log(`[AI Categorization] Starting batch ${batch_id} for ${senders.length} senders`);

    // Get Lovable AI key
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Process all senders in parallel (NO LIMITS)
    const suggestions = await Promise.allSettled(
      senders.map((sender) => processSender(sender, existing_groups, model, LOVABLE_API_KEY))
    );

    // Separate successful and failed
    const successful = suggestions.filter((r) => r.status === 'fulfilled') as PromiseFulfilledResult<any>[];
    const failed = suggestions.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];

    console.log(`[AI Categorization] Batch ${batch_id} completed: ${successful.length} success, ${failed.length} failed`);

    // Calculate totals
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCostEur = 0;
    const isFreeModel = model.includes('gemini-2.5-flash');

    const suggestionResults = [];

    for (const result of successful) {
      const data = result.value;
      totalInputTokens += data.tokens_input;
      totalOutputTokens += data.tokens_output;
      totalCostEur += data.cost_eur;

      // Save to database
      const { data: savedSuggestion, error: saveError } = await supabaseClient
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
          model_used: model,
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
    await supabaseClient.from('ai_cost_tracking').insert({
      user_id,
      batch_id,
      operation_type: 'email_categorization',
      model_used: model,
      provider: model.split('/')[0],
      input_tokens: totalInputTokens,
      output_tokens: totalOutputTokens,
      cost_input_eur: isFreeModel ? 0 : totalInputTokens * getCostPerToken(model, 'input'),
      cost_output_eur: isFreeModel ? 0 : totalOutputTokens * getCostPerToken(model, 'output'),
      cost_total_eur: totalCostEur,
      operation_metadata: {
        senders_count: senders.length,
        successful: successful.length,
        failed: failed.length,
        is_free: isFreeModel,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        batch_id,
        suggestions: suggestionResults,
        batch_summary: {
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
  model: string,
  apiKey: string
) {
  const systemPrompt = `Sei un esperto di categorizzazione email business per PMI italiane.

COMPITO:
Analizza i messaggi del mittente e suggerisci la categoria più appropriata tra quelle esistenti, oppure proponi una nuova categoria se necessario.

GRUPPI ESISTENTI:
${existingGroups.map((g) => `- ${g.name} (${g.type})${g.description ? ': ' + g.description : ''}`).join('\n')}

CRITERI DECISIONE:
1. Se il mittente si adatta bene a un gruppo esistente (confidence > 0.75) → scegli quello
2. Se nessun gruppo esistente è appropriato → suggerisci nuovo gruppo con nome/tipo/descrizione
3. Tipi validi: clienti, fornitori, partner, newsletter, servizi, banche, notifiche, spam, altro

REGOLE OUTPUT:
- Rispondi SEMPRE con JSON valido
- Reasoning: max 100 parole, focus su motivo principale
- Confidence: 0.0-1.0 (usa tutto lo spettro)
- Se nuovo gruppo: fornisci name, type, description breve

OUTPUT FORMAT (JSON):
{
  "suggested_group": {
    "id": "uuid-esistente" | null,
    "name": "Nome Gruppo",
    "type": "clienti|fornitori|...",
    "is_new": boolean,
    "description": "Breve descrizione"
  },
  "confidence": 0.85,
  "reasoning": "Spiegazione concisa..."
}`;

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

  console.log(`[AI Categorization] Processing ${sender.email} with ${model}`);

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API error: ${response.status} - ${errorText}`);
  }

  const aiResponse = await response.json();
  const content = aiResponse.choices[0].message.content;
  const usage = aiResponse.usage;

  // Parse JSON response
  let parsedResult;
  try {
    parsedResult = JSON.parse(content);
  } catch {
    // Fallback if AI didn't return valid JSON
    parsedResult = {
      suggested_group: {
        id: null,
        name: 'Altro',
        type: 'altro',
        is_new: true,
      },
      confidence: 0.5,
      reasoning: 'Impossibile analizzare automaticamente',
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
  const isFree = model.includes('gemini-2.5-flash');
  const costEur = isFree
    ? 0
    : (usage.prompt_tokens * getCostPerToken(model, 'input') +
        usage.completion_tokens * getCostPerToken(model, 'output'));

  return {
    sender_email: sender.email,
    suggested_group: parsedResult.suggested_group,
    confidence: parsedResult.confidence,
    reasoning: parsedResult.reasoning,
    tokens_input: usage.prompt_tokens,
    tokens_output: usage.completion_tokens,
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
