import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  group_id: string;
  user_email: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: RequestBody = await req.json();
    console.log('📥 Request:', { group_id: body.group_id, user_email: body.user_email });

    if (!body.group_id || !body.user_email) {
      return new Response(
        JSON.stringify({ error: 'Missing group_id or user_email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Fetch group info
    const { data: group, error: groupError } = await supabase
      .from('email_sender_groups')
      .select('*')
      .eq('id', body.group_id)
      .single();

    if (groupError || !group) {
      console.error('❌ Group not found:', groupError);
      return new Response(
        JSON.stringify({ error: 'Group not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Fetch senders assigned to this group
    const { data: { user } } = await supabase.auth.admin.getUserById(
      (await supabase.from('user_profiles').select('user_id').eq('tmwe_email', body.user_email).single()).data?.user_id
    );

    const { data: rules, error: rulesError } = await supabase
      .from('email_sender_rules')
      .select('sender_email')
      .eq('group_id', body.group_id)
      .eq('user_id', user?.id || body.user_email);

    if (rulesError) {
      console.error('❌ Rules fetch error:', rulesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch group senders' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const senderEmails = rules?.map(r => r.sender_email) || [];
    const senderCount = senderEmails.length;

    // Filter: only groups with 3+ senders
    if (senderCount < 3) {
      console.log(`⏭️ Skip group "${group.nome_gruppo}": only ${senderCount} senders (minimum 3)`);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Group has less than 3 senders',
          sender_count: senderCount,
          minimum_required: 3
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📧 Group "${group.nome_gruppo}": ${senderCount} senders`);

    // 3. Sample emails (random sampling, max 10 senders × 5 emails each)
    const maxSenders = Math.min(senderCount, 10);
    const sampledSenders = senderEmails.slice(0, maxSenders);
    
    let allEmailSamples: any[] = [];
    let totalSampleCount = 0;

    for (const senderEmail of sampledSenders) {
      const { data: emails } = await supabase
        .from('email_messages')
        .select('subject, body_text, data_ricezione')
        .eq('user_email', body.user_email)
        .eq('from_email', senderEmail)
        .not('subject', 'is', null)
        .order('RANDOM()')
        .limit(5);

      if (emails && emails.length > 0) {
        allEmailSamples.push(...emails.map(e => ({
          sender: senderEmail,
          subject: e.subject,
          body_preview: e.body_text?.substring(0, 150) || '',
          date: e.data_ricezione
        })));
        totalSampleCount += emails.length;
      }
    }

    if (allEmailSamples.length === 0) {
      console.log(`⚠️ No email samples found for group "${group.nome_gruppo}"`);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'No email samples available',
          sender_count: senderCount
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📬 Sampled ${allEmailSamples.length} emails from ${sampledSenders.length} senders`);

    // 4. Fetch company context (if available)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_context_ai')
      .eq('tmwe_email', body.user_email)
      .single();

    const companyContext = profile?.company_context_ai || '';
    if (!companyContext) {
      console.log('⚠️ No company_context_ai found, proceeding without');
    }

    // 5. Build AI prompt
    const systemPrompt = `Sei un assistente AI specializzato nell'analisi di gruppi di mittenti email aziendali.

Il tuo compito è generare un CONTEXT SUMMARY (150-300 caratteri) e SENDER PATTERNS per un gruppo email esistente.

ESEMPIO OUTPUT ATTESO:
context_summary: "Gruppo fornitori IT (Microsoft, Adobe). Comunicazioni su rinnovi licenze, fatture software, support tecnico. Tone formale, urgenza media."

sender_patterns: {
  common_subjects: ["Fattura", "Rinnovo licenza", "Support ticket"],
  typical_senders: ["billing@microsoft.com", "support@adobe.com"],
  key_phrases: ["scadenza", "pagamento", "contratto"],
  business_type: "IT Software Vendors",
  communication_style: "formal",
  urgency_level: "medium"
}

QUALITY INDICATORS:
- data_sufficiency: 0-1 (hai abbastanza dati per analisi affidabile?)
- pattern_clarity: 0-1 (i pattern sono chiari e distintivi?)

${companyContext ? `CONTEXT AZIENDALE:\n${companyContext}\n` : ''}

Rispondi SOLO con JSON valido usando la funzione generate_context.`;

    const userPrompt = `Analizza questo gruppo e genera context summary + patterns:

GRUPPO: ${group.nome_gruppo}
DESCRIZIONE: ${group.descrizione || 'Nessuna descrizione'}
TIPO: ${group.tipo || 'custom'}

MITTENTI NEL GRUPPO (${senderCount} totali, campionati ${sampledSenders.length}):
${sampledSenders.slice(0, 10).join(', ')}

CAMPIONI EMAIL (${allEmailSamples.length} totali):
${allEmailSamples.slice(0, 15).map((e, i) => 
  `${i + 1}. [${e.sender}] "${e.subject}" - ${e.body_preview}`
).join('\n')}

Genera context summary conciso (150-300 caratteri) e sender patterns dettagliati.`;

    // 6. Get AI config (fallback system)
    const { data: aiConfigs } = await supabase
      .from('config_ai')
      .select('*')
      .eq('attivo', true)
      .order('created_at', { ascending: false });

    if (!aiConfigs || aiConfigs.length === 0) {
      console.error('❌ No active AI configs');
      return new Response(
        JSON.stringify({ error: 'No active AI configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔄 Found ${aiConfigs.length} AI configs`);

    // 7. AI request with tool calling
    const requestBody: any = {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'generate_context',
            description: 'Generate context summary and sender patterns for email group',
            parameters: {
              type: 'object',
              properties: {
                context_summary: {
                  type: 'string',
                  minLength: 150,
                  maxLength: 300,
                  description: 'Concise summary of the group (150-300 chars)'
                },
                sender_patterns: {
                  type: 'object',
                  properties: {
                    common_subjects: { 
                      type: 'array', 
                      items: { type: 'string' },
                      description: 'Most common email subjects'
                    },
                    typical_senders: { 
                      type: 'array', 
                      items: { type: 'string' },
                      description: 'Representative sender emails'
                    },
                    key_phrases: { 
                      type: 'array', 
                      items: { type: 'string' },
                      description: 'Important keywords/phrases'
                    },
                    business_type: { 
                      type: 'string',
                      description: 'Type of business/organization'
                    },
                    communication_style: { 
                      type: 'string',
                      enum: ['formal', 'casual', 'mixed'],
                      description: 'Communication tone'
                    },
                    urgency_level: { 
                      type: 'string',
                      enum: ['low', 'medium', 'high', 'critical'],
                      description: 'Typical urgency level'
                    }
                  },
                  required: ['common_subjects', 'key_phrases', 'business_type', 'communication_style', 'urgency_level'],
                  additionalProperties: false
                },
                data_sufficiency: {
                  type: 'number',
                  minimum: 0,
                  maximum: 1,
                  description: 'Quality indicator: sufficient data for analysis?'
                },
                pattern_clarity: {
                  type: 'number',
                  minimum: 0,
                  maximum: 1,
                  description: 'Quality indicator: patterns are clear and distinctive?'
                }
              },
              required: ['context_summary', 'sender_patterns', 'data_sufficiency', 'pattern_clarity'],
              additionalProperties: false
            }
          }
        }
      ],
      tool_choice: { type: 'function', function: { name: 'generate_context' } }
    };

    // Fallback system
    let aiResponse: any;
    let successfulConfig: any = null;
    let lastError = '';

    for (const aiConfig of aiConfigs) {
      try {
        console.log(`🔄 Trying ${aiConfig.provider}/${aiConfig.modello}...`);

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout 30s')), 30000)
        );

        let aiPromise: Promise<Response>;

        if (aiConfig.provider === 'anthropic') {
          aiPromise = fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': aiConfig.api_key,
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
              model: aiConfig.modello,
              max_tokens: 2000,
              ...requestBody
            })
          });
        } else if (aiConfig.provider === 'openai') {
          aiPromise = fetch('https://api.openai.com/v1/chat/completions', {
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
          const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
          if (!lovableApiKey) {
            console.log(`⏭️ Skip lovable: LOVABLE_API_KEY not configured`);
            continue;
          }

          aiPromise = fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${lovableApiKey}`
            },
            body: JSON.stringify({
              model: aiConfig.modello || 'google/gemini-2.5-flash',
              ...requestBody
            })
          });
        } else {
          console.log(`⏭️ Skip unsupported provider: ${aiConfig.provider}`);
          continue;
        }

        aiResponse = await Promise.race([aiPromise, timeoutPromise]) as Response;

        if (aiResponse.ok) {
          successfulConfig = aiConfig;
          console.log(`✅ Success with ${aiConfig.provider}/${aiConfig.modello}`);
          break;
        } else {
          const errorText = await aiResponse.text();
          lastError = errorText;
          console.error(`❌ ${aiConfig.provider} error:`, aiResponse.status, errorText);
          continue;
        }
      } catch (error: any) {
        console.error(`❌ Exception with ${aiConfig.provider}:`, error.message);
        lastError = error.message;
        continue;
      }
    }

    if (!successfulConfig || !aiResponse?.ok) {
      console.error('❌ All AI configs failed');
      return new Response(
        JSON.stringify({ error: 'All AI providers failed', details: lastError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    console.log('🤖 AI Response received');

    // Extract context from tool call
    let contextData: any;
    if (successfulConfig.provider === 'anthropic') {
      const toolUse = aiData.content?.find((c: any) => c.type === 'tool_use');
      contextData = toolUse?.input;
    } else if (successfulConfig.provider === 'openai' || successfulConfig.provider === 'lovable') {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        contextData = JSON.parse(toolCall.function.arguments);
      }
    }

    if (!contextData?.context_summary || !contextData?.sender_patterns) {
      console.error('❌ Invalid AI response structure');
      return new Response(
        JSON.stringify({ error: 'AI did not provide valid context' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate quality score
    const qualityScore = (
      (contextData.data_sufficiency || 0) * 0.6 +
      (contextData.pattern_clarity || 0) * 0.4
    );

    console.log(`📊 Quality Score: ${qualityScore.toFixed(2)} (data: ${contextData.data_sufficiency}, clarity: ${contextData.pattern_clarity})`);

    // Validation: quality_score > 0.6
    if (qualityScore < 0.6) {
      console.warn(`⚠️ Low quality score ${qualityScore.toFixed(2)} for group "${group.nome_gruppo}"`);
    }

    // 8. Save to database
    const { data: savedContext, error: saveError } = await supabase
      .from('email_sender_groups_context')
      .upsert({
        group_id: body.group_id,
        user_email: body.user_email,
        context_summary: contextData.context_summary,
        sender_patterns: contextData.sender_patterns,
        quality_score: qualityScore,
        data_sufficiency: contextData.data_sufficiency,
        pattern_clarity: contextData.pattern_clarity,
        sender_count: senderCount,
        sample_count: allEmailSamples.length,
        model_used: `${successfulConfig.provider}/${successfulConfig.modello}`,
        generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'group_id,user_email'
      })
      .select()
      .single();

    if (saveError) {
      console.error('❌ Save error:', saveError);
      return new Response(
        JSON.stringify({ error: 'Failed to save context', details: saveError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Context saved in ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        context_id: savedContext.id,
        context_summary: contextData.context_summary,
        quality_score: qualityScore,
        sample_count: allEmailSamples.length,
        sender_count: senderCount,
        duration_ms: duration
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
