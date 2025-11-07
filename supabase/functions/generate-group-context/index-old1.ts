import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  group_id: string;
  user_id: string;
}

interface SenderPatterns {
  domain_patterns: string[];
  business_type: string;
  communication_style: string;
  frequency: string;
  common_indicators: string[];
}

interface ContextResponse {
  context_summary: string;
  sender_patterns: SenderPatterns;
  data_sufficiency: number;
  pattern_clarity: number;
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
    console.log('📥 Request:', { group_id: body.group_id, user_id: body.user_id });

    if (!body.group_id || !body.user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: group_id, user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Get group info
    const { data: group, error: groupError } = await supabase
      .from('email_sender_groups')
      .select('id, nome_gruppo, descrizione')
      .eq('id', body.group_id)
      .single();

    if (groupError || !group) {
      console.error('❌ Group not found:', groupError);
      return new Response(
        JSON.stringify({ error: 'Group not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Group: ${group.nome_gruppo}`);

    // 2. Get senders assigned to this group
    const { data: senderRules, error: rulesError } = await supabase
      .from('email_sender_rules')
      .select('sender_email')
      .eq('group_id', body.group_id)
      .eq('user_id', body.user_id);

    if (rulesError || !senderRules || senderRules.length === 0) {
      console.error('❌ No senders found for this group:', rulesError);
      return new Response(
        JSON.stringify({ error: 'No senders assigned to this group yet' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const senderEmails = senderRules.map(r => r.sender_email);
    console.log(`👥 Found ${senderEmails.length} senders in group`);

    if (senderEmails.length < 3) {
      console.warn('⚠️ Too few senders for reliable pattern analysis');
      return new Response(
        JSON.stringify({ 
          error: 'Need at least 3 senders for reliable pattern analysis',
          current_count: senderEmails.length 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Get email samples for each sender (3-5 per sender)
    const { data: emailSamples, error: samplesError } = await supabase
      .from('email_messages')
      .select('from_email, oggetto, data_ricezione, cartella')
      .in('from_email', senderEmails)
      .eq('user_email', body.user_email)
      .order('data_ricezione', { ascending: false })
      .limit(senderEmails.length * 5); // Max 5 samples per sender

    if (samplesError || !emailSamples || emailSamples.length === 0) {
      console.error('❌ No email samples found:', samplesError);
      return new Response(
        JSON.stringify({ error: 'No email samples found for analysis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📧 Analyzing ${emailSamples.length} email samples`);

    // 4. Group samples by sender and extract domains
    const senderData = new Map<string, any>();
    emailSamples.forEach(email => {
      if (!senderData.has(email.from_email)) {
        const domain = email.from_email.split('@')[1] || 'unknown';
        senderData.set(email.from_email, {
          email: email.from_email,
          domain: domain,
          samples: [],
          emailCount: 0
        });
      }
      const sender = senderData.get(email.from_email);
      sender.samples.push({
        subject: email.oggetto,
        date: email.data_ricezione,
        folder: email.cartella
      });
      sender.emailCount++;
    });

    // Extract unique domains
    const uniqueDomains = Array.from(new Set(Array.from(senderData.values()).map(s => s.domain)));

    // 5. Get AI config (fallback system)
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

    console.log(`🔄 Found ${aiConfigs.length} active AI configs`);

    // 6. Build AI prompt
    const systemPrompt = `Sei un esperto di pattern analysis per email aziendali.

Analizza questi ${senderEmails.length} mittenti assegnati al gruppo "${group.nome_gruppo}" e genera:

1. CONTEXT SUMMARY (150-300 caratteri): Descrizione pattern comune dei mittenti
   Esempio: "Mittenti clienti B2B del settore logistics, domini aziendali strutturati, comunicazioni formali con frequenza media 2-5 email/settimana"

2. SENDER PATTERNS (JSON strutturato):
   {
     "domain_patterns": ["@cliente1.com", "@cliente2.it", "*.logistics"],
     "business_type": "customers|suppliers|authorities|partners|internal|mixed",
     "communication_style": "formal|informal|automated|mixed",
     "frequency": "low|medium|high",
     "common_indicators": ["indicatori pattern comuni"]
   }

3. QUALITY METRICS (0-1):
   - data_sufficiency: Quanti dati hai per l'analisi?
   - pattern_clarity: Quanto sono chiari i pattern comuni?

MITTENTI ANALIZZATI:
${Array.from(senderData.values()).map(s => 
  `- ${s.email} (${s.emailCount} email, domain: ${s.domain})`
).join('\n')}

DOMINI UNICI: ${uniqueDomains.join(', ')}

CAMPIONI EMAIL (primi 20):
${Array.from(senderData.values()).slice(0, 10).flatMap(s => 
  s.samples.slice(0, 2).map((sample: any) => 
    `From: ${s.email}\nSubject: ${sample.subject}\nDate: ${new Date(sample.date).toLocaleDateString('it-IT')}`
  )
).slice(0, 20).join('\n---\n')}

Rispondi SOLO con JSON usando la funzione generate_context.`;

    const requestBody: any = {
      messages: [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: `Genera context_summary e sender_patterns per il gruppo "${group.nome_gruppo}" analizzando i ${senderEmails.length} mittenti forniti.` 
        }
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'generate_context',
            description: 'Generate knowledge base context for email sender group',
            parameters: {
              type: 'object',
              properties: {
                context_summary: {
                  type: 'string',
                  description: 'Descrizione pattern comuni (150-300 caratteri)',
                  minLength: 150,
                  maxLength: 300
                },
                sender_patterns: {
                  type: 'object',
                  properties: {
                    domain_patterns: {
                      type: 'array',
                      items: { type: 'string' }
                    },
                    business_type: {
                      type: 'string',
                      enum: ['customers', 'suppliers', 'authorities', 'partners', 'internal', 'mixed']
                    },
                    communication_style: {
                      type: 'string',
                      enum: ['formal', 'informal', 'automated', 'mixed']
                    },
                    frequency: {
                      type: 'string',
                      enum: ['low', 'medium', 'high']
                    },
                    common_indicators: {
                      type: 'array',
                      items: { type: 'string' }
                    }
                  },
                  required: ['domain_patterns', 'business_type', 'communication_style', 'frequency', 'common_indicators']
                },
                data_sufficiency: {
                  type: 'number',
                  minimum: 0,
                  maximum: 1
                },
                pattern_clarity: {
                  type: 'number',
                  minimum: 0,
                  maximum: 1
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

    // 7. Try each AI config until one works
    let aiResponse: any;
    let successfulConfig: any = null;
    let lastError = '';

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
              max_tokens: 2000,
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
      console.error('❌ All AI configs failed. Last error:', lastError);
      return new Response(
        JSON.stringify({ 
          error: 'All AI providers failed', 
          details: lastError 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    console.log('🤖 AI Response received');

    // 8. Extract context from tool call
    let contextResult: ContextResponse | null = null;

    if (successfulConfig.provider === 'anthropic') {
      const toolUse = aiData.content?.find((c: any) => c.type === 'tool_use');
      if (toolUse?.input) {
        contextResult = toolUse.input;
      }
    } else if (successfulConfig.provider === 'openai' || successfulConfig.provider === 'lovable') {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        contextResult = JSON.parse(toolCall.function.arguments);
      }
    }

    if (!contextResult) {
      console.error('❌ No context extracted from AI response');
      return new Response(
        JSON.stringify({ error: 'AI did not provide valid context' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Context extracted:', {
      summary_length: contextResult.context_summary.length,
      business_type: contextResult.sender_patterns.business_type,
      data_sufficiency: contextResult.data_sufficiency,
      pattern_clarity: contextResult.pattern_clarity
    });

    // 9. Calculate quality score
    const qualityScore = (contextResult.data_sufficiency + contextResult.pattern_clarity) / 2;

    // 10. Save to database (UPSERT)
    const { data: savedContext, error: saveError } = await supabase
      .from('email_sender_groups_context')
      .upsert({
        group_id: body.group_id,
        user_id: body.user_id,
        context_summary: contextResult.context_summary,
        sender_patterns: contextResult.sender_patterns,
        quality_score: qualityScore,
        sender_count: senderEmails.length,
        sample_count: emailSamples.length,
        generated_at: new Date().toISOString(),
        needs_refresh: false
      }, {
        onConflict: 'group_id,user_id'
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

    console.log('✅ Context saved to database');

    return new Response(
      JSON.stringify({
        success: true,
        group_name: group.nome_gruppo,
        context_id: savedContext.id,
        context_summary: contextResult.context_summary,
        sender_patterns: contextResult.sender_patterns,
        quality_score: qualityScore,
        sender_count: senderEmails.length,
        sample_count: emailSamples.length
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
