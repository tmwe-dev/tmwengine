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

    // Get user's company context (if available)
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('company_context_ai')
      .eq('user_email', body.user_email)
      .single();

    const companyContext = userProfile?.company_context_ai || null;
    console.log(`🏢 Company context: ${companyContext ? 'FOUND (' + companyContext.substring(0, 50) + '...)' : 'NOT FOUND'}`);

    // Get ALL active AI configs for fallback system
    const { data: aiConfigs, error: configError } = await supabase
      .from('config_ai')
      .select('*')
      .eq('attivo', true)
      .order('created_at', { ascending: false });

    if (configError || !aiConfigs || aiConfigs.length === 0) {
      console.error('❌ No active AI configs:', configError);
      return new Response(
        JSON.stringify({ error: 'No active AI configuration found' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔄 Found ${aiConfigs.length} active AI configs, will try in order:`, 
      aiConfigs.map(c => `${c.provider}/${c.modello}`).join(', '));

    // 🧠 STEP 1: Carica Knowledge Base gruppi esistenti
    const { data: groupContexts, error: contextError } = await supabase
      .from('email_sender_groups_context')
      .select('group_id, context_summary, sender_patterns, quality_score')
      .eq('user_email', body.user_email);

    if (contextError) {
      console.warn('⚠️ Impossibile caricare knowledge base gruppi:', contextError);
    }

    // Crea mappa group_id → context per arricchire prompt
    const contextsMap = new Map<string, any>();
    (groupContexts || []).forEach(ctx => {
      contextsMap.set(ctx.group_id, ctx);
    });

    console.log(`📊 Knowledge Base: ${contextsMap.size} gruppi con context caricati`);

    // Build system prompt CON KNOWLEDGE BASE
    const systemPrompt = `Sei un assistente AI specializzato nella categorizzazione di MITTENTI email (non contenuti).
${companyContext ? `
🏢 **CONTESTO AZIENDALE DELL'UTENTE**
${companyContext}

IMPORTANTE: Utilizza questo contesto per comprendere meglio il tipo di mittenti e classificarli secondo le categorie aziendali specifiche definite dall'utente. Le tue classificazioni devono essere coerenti con questo profilo aziendale.
` : ''}
Il tuo compito è analizzare CHI È IL MITTENTE e suggerire 1-3 gruppi dove classificarlo.

🎯 FOCUS: Analizza la NATURA DEL MITTENTE, non il contenuto delle email.

GRUPPI ESISTENTI:
${body.existing_groups.map(g => {
  const context = contextsMap.get(g.id);
  const contextInfo = context 
    ? `\n   📊 PATTERN: ${context.context_summary}\n   🔍 SENDER PATTERNS: ${JSON.stringify(context.sender_patterns)}`
    : '';
  return `- ${g.nome_gruppo} (${g.tipo || 'custom'}): ${g.descrizione || 'Gruppo personalizzato'}${contextInfo}`;
}).join('\n')}

REGOLE DI ANALISI:
1. 🏢 ANALIZZA IL MITTENTE (NON IL CONTENUTO):
   - Dominio email (es. @cliente.com = esterno, @tuaazienda.com = interno)
   - Nome azienda/persona dal display name
   - Pattern di invio (frequenza, orari, volumi)
   - Tipo business (cliente, fornitore, partner, spedizioniere, autorità)

2. ❌ NON ANALIZZARE:
   - Oggetti email (es. "preventivo" non significa che mittente sia "Commerciale")
   - Contenuto body (es. "documenti doganali" non significa che sia "Operativo")
   - Argomenti discussi (un cliente può scrivere di operatività ma resta CLIENTE)

3. ✅ ESEMPI CORRETTI:
   - mittente@asmlogistics.com + "ASM Logistics" → CLIENTE (azienda esterna che ci scrive)
   - fatture@spedizioniexpress.it + invii frequenti → FORNITORI/SPEDIZIONIERI
   - noreply@agenziamaritime.it + pattern automatico → AUTORITÀ/ENTI
   - collega@tuaazienda.com → TEAM INTERNO (se esiste gruppo)

4. 📊 USA KNOWLEDGE BASE:
   - Se gruppo ha context_summary con "mittenti clienti B2B", usa quel pattern
   - Se sender_patterns mostra domini "@cliente.*", preferisci quel gruppo per nuovi @cliente
   - Quality score alto = pattern affidabile, usalo come riferimento

5. 🎯 CONFIDENCE:
   - >0.85: Mittente match chiaro con pattern gruppo (es. dominio cliente match pattern clienti)
   - 0.60-0.85: Indicatori parziali ma non definitivi
   - <0.60: Incerto, servono più dati

6. 🔢 SUGGERIMENTI:
   - Proponi MASSIMO 3 suggerimenti, ordinati per rilevanza
   - Preferisci SEMPRE gruppi esistenti quando appropriati
   - Suggerisci nuovo gruppo SOLO se NESSUNO dei ${body.existing_groups.length}+ esistenti calza

7. 📋 FORMATO RISPOSTA:
   - group_id: ID del gruppo esistente (o null per nuovo gruppo)
   - group_name: Nome del gruppo
   - confidence: Valore 0-1
   - reason: Spiegazione breve (max 50 caratteri) che menziona TIPO MITTENTE (non contenuto)

Rispondi SOLO con JSON valido usando la funzione suggest_groups.`;

    // Build user prompt (focus su CHI È il mittente)
    const userPrompt = `Analizza questo MITTENTE e suggerisci 1-3 gruppi appropriati:

🏢 MITTENTE: ${body.sender_email}
📊 VOLUME: ${body.email_samples.length} email campionate

CAMPIONI EMAIL (per rilevare pattern temporali/formali, NON per contenuto):
${body.email_samples.map((email, i) => {
  const date = new Date(email.date);
  const dayOfWeek = date.toLocaleDateString('it-IT', { weekday: 'short' });
  const hour = date.getHours();
  return `${i + 1}. [${dayOfWeek} ${hour}:00] "${email.subject.substring(0, 60)}"`;
}).join('\n')}

🎯 FOCUS: Chi è questo mittente? È un cliente che ci scrive? Un fornitore? Un'autorità? Un collega?
📧 DOMINIO: ${body.sender_email.split('@')[1]}
🔍 PATTERN TEMPORALE: ${body.email_samples.length} email, orari ${body.email_samples.map(e => new Date(e.date).getHours()).join(', ')}

Suggerisci i gruppi più appropriati basandoti sulla NATURA DEL MITTENTE (non su cosa scrive).`;

    // 🔄 FALLBACK SYSTEM: Try each AI config until one works
    let aiResponse: any;
    let successfulConfig: any = null;
    let lastError: string = '';
    
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

    // Try each config in order
    for (const aiConfig of aiConfigs) {
      try {
        console.log(`🔄 Trying ${aiConfig.provider}/${aiConfig.modello}...`);

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
        } else if (aiConfig.provider === 'lovable') {
          // 🔑 Lovable AI usa LOVABLE_API_KEY dal env (non dalla tabella)
          const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
          if (!lovableApiKey) {
            console.log(`⏭️ Skipping lovable: LOVABLE_API_KEY not configured`);
            continue;
          }
          
          aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${lovableApiKey}`
            },
            body: JSON.stringify({
              model: aiConfig.modello,
              ...requestBody
            })
          });
        } else {
          console.log(`⏭️ Skipping unsupported provider: ${aiConfig.provider}`);
          continue;
        }

        if (aiResponse.ok) {
          successfulConfig = aiConfig;
          console.log(`✅ Success with ${aiConfig.provider}/${aiConfig.modello}`);
          break;
        } else {
          const errorText = await aiResponse.text();
          lastError = errorText;
          
          // Check if it's a credit/quota error - if so, try next config
          if (errorText.includes('credit balance') || 
              errorText.includes('quota') || 
              errorText.includes('insufficient_quota') ||
              errorText.includes('rate_limit')) {
            console.log(`⚠️ ${aiConfig.provider} failed (no credits/quota), trying next...`);
            continue;
          } else {
            // Other error - log but still try next config
            console.error(`❌ ${aiConfig.provider} error:`, aiResponse.status, errorText);
            continue;
          }
        }
      } catch (error: any) {
        console.error(`❌ Exception with ${aiConfig.provider}:`, error.message);
        lastError = error.message;
        continue;
      }
    }

    // If no config worked, return error
    if (!successfulConfig || !aiResponse?.ok) {
      console.error('❌ All AI configs failed. Last error:', lastError);
      return new Response(
        JSON.stringify({ 
          error: 'All AI providers failed', 
          details: lastError,
          hint: 'Try activating Lovable AI in /configurazione-ai'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    console.log('🤖 AI Response:', JSON.stringify(aiData, null, 2));

    // Extract suggestions from tool call
    let suggestions: GroupingSuggestion[] = [];
    if (successfulConfig.provider === 'anthropic') {
      const toolUse = aiData.content?.find((c: any) => c.type === 'tool_use');
      if (toolUse?.input?.suggestions) {
        suggestions = toolUse.input.suggestions;
      }
    } else if (successfulConfig.provider === 'openai' || successfulConfig.provider === 'lovable') {
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

    // Check for existing suggestion (anti-duplicate)
    const { data: existing, error: checkError } = await supabase
      .from('email_sender_grouping_suggestions')
      .select('id, status')
      .eq('sender_email', body.sender_email)
      .eq('user_email', body.user_email)
      .in('status', ['pending', 'accepted'])
      .maybeSingle();

    if (existing) {
      console.log(`⚠️ Suggerimento già esistente per ${body.sender_email} (status: ${existing.status}), skip INSERT`);
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Suggerimento già esistente',
          suggestion_id: existing.id,
          skipped: true,
          status: existing.status
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Save to database (only if not exists)
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
