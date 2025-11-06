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
  nome_gruppo: string;
  tipo?: string;
  colore?: string;
  icon?: string;
  descrizione?: string;
}

interface GroupingSuggestion {
  group_id: string | null;
  group_name: string;
  confidence: number;
  reason: string;
}

interface RequestBody {
  sender_email: string;
  email_samples: EmailSample[];
  existing_groups: ExistingGroup[];
  user_email: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: RequestBody = await req.json();
    console.log('📥 Request:', { sender_email: body.sender_email, samples: body.email_samples?.length });

    // Validation
    if (!body.sender_email || !body.email_samples || !body.existing_groups || !body.user_email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: sender_email, email_samples, existing_groups, user_email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get active AI config
    const { data: aiConfig, error: configError } = await supabase
      .from('config_ai')
      .select('*')
      .eq('attivo', true)
      .single();

    if (configError || !aiConfig) {
      console.error('❌ No active AI config:', configError);
      return new Response(
        JSON.stringify({ error: 'No active AI configuration found' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ AI Config:', { provider: aiConfig.provider, model: aiConfig.modello });

    // Build system prompt
    const systemPrompt = `Sei un assistente AI specializzato nella categorizzazione di mittenti email per un sistema di gestione email aziendale.

Il tuo compito è analizzare un mittente email e suggerire 1-3 gruppi possibili dove categorizzarlo.

GRUPPI ESISTENTI:
${body.existing_groups.map(g => `- ${g.nome_gruppo} (${g.tipo || 'custom'}): ${g.descrizione || 'Gruppo personalizzato'}`).join('\n')}

REGOLE:
1. Proponi MASSIMO 3 suggerimenti, ordinati per rilevanza (primo = più rilevante)
2. Per ogni suggerimento, indica:
   - group_id: ID del gruppo esistente (o null se suggerisci un nuovo gruppo)
   - group_name: Nome del gruppo (esistente o proposto)
   - confidence: Valore 0-1 che indica quanto sei sicuro
   - reason: Spiegazione breve (max 50 caratteri)
3. Preferisci SEMPRE gruppi esistenti quando possibile
4. Puoi suggerire un nuovo gruppo solo se nessuno di quelli esistenti è appropriato
5. Basati su: dominio email, oggetti email, contenuti preview, pattern comuni

Rispondi SOLO con JSON valido usando la funzione suggest_groups.`;

    // Build user prompt
    const userPrompt = `Analizza questo mittente e suggerisci 1-3 gruppi appropriati:

MITTENTE: ${body.sender_email}

CAMPIONI EMAIL (ultimi ${body.email_samples.length}):
${body.email_samples.map((email, i) => `${i + 1}. "${email.subject}" - ${email.body_preview?.substring(0, 100) || '(no preview)'}`).join('\n')}

Suggerisci i gruppi più appropriati per questo mittente.`;

    // Call AI with tool calling
    let aiResponse: any;
    const requestBody: any = {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'suggest_groups',
            description: 'Suggerisci gruppi per il mittente email',
            parameters: {
              type: 'object',
              properties: {
                suggestions: {
                  type: 'array',
                  description: 'Array di 1-3 suggerimenti ordinati per rilevanza',
                  minItems: 1,
                  maxItems: 3,
                  items: {
                    type: 'object',
                    properties: {
                      group_id: {
                        type: ['string', 'null'],
                        description: 'UUID del gruppo esistente o null per nuovo gruppo'
                      },
                      group_name: {
                        type: 'string',
                        description: 'Nome del gruppo'
                      },
                      confidence: {
                        type: 'number',
                        description: 'Confidence 0-1',
                        minimum: 0,
                        maximum: 1
                      },
                      reason: {
                        type: 'string',
                        description: 'Spiegazione breve (max 50 caratteri)',
                        maxLength: 50
                      }
                    },
                    required: ['group_id', 'group_name', 'confidence', 'reason'],
                    additionalProperties: false
                  }
                }
              },
              required: ['suggestions'],
              additionalProperties: false
            }
          }
        }
      ],
      tool_choice: { type: 'function', function: { name: 'suggest_groups' } }
    };

    if (aiConfig.provider === 'anthropic') {
      aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': aiConfig.api_key,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: aiConfig.modello,
          max_tokens: 1000,
          ...requestBody
        })
      });
    } else if (aiConfig.provider === 'openai') {
      aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aiConfig.api_key}`
        },
        body: JSON.stringify({
          model: aiConfig.modello,
          ...requestBody
        })
      });
    } else {
      return new Response(
        JSON.stringify({ error: `Unsupported AI provider: ${aiConfig.provider}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('❌ AI API Error:', aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI API request failed', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    console.log('🤖 AI Response:', JSON.stringify(aiData, null, 2));

    // Extract suggestions from tool call
    let suggestions: GroupingSuggestion[] = [];
    if (aiConfig.provider === 'anthropic') {
      const toolUse = aiData.content?.find((c: any) => c.type === 'tool_use');
      if (toolUse?.input?.suggestions) {
        suggestions = toolUse.input.suggestions;
      }
    } else if (aiConfig.provider === 'openai') {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        const parsed = JSON.parse(toolCall.function.arguments);
        suggestions = parsed.suggestions || [];
      }
    }

    if (suggestions.length === 0) {
      console.error('❌ No suggestions extracted from AI response');
      return new Response(
        JSON.stringify({ error: 'AI did not provide valid suggestions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Extracted suggestions:', suggestions);

    // Save to database
    const { data: savedSuggestion, error: saveError } = await supabase
      .from('email_sender_grouping_suggestions')
      .insert({
        user_email: body.user_email,
        sender_email: body.sender_email,
        suggested_groups: suggestions,
        status: 'pending',
        analyzed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (saveError) {
      console.error('❌ Save error:', saveError);
      return new Response(
        JSON.stringify({ error: 'Failed to save suggestions', details: saveError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Suggestions saved:', savedSuggestion.id);

    return new Response(
      JSON.stringify({
        success: true,
        suggestion_id: savedSuggestion.id,
        suggestions: suggestions
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
