import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ✅ NUOVO: Accetta email_id (UUID) dal DB locale
    const { 
      email_id,
      user_email,
      force_category = null
    } = await req.json();

    console.log('📧 Classificazione Intelligente Email:', { email_id, user_email, force_category });

    if (!email_id || !user_email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email_id, user_email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ✅ Fetch email from local DB (email_messages table)
    const { data: email, error: emailError } = await supabase
      .from('email_messages')
      .select('*')
      .eq('id', email_id)
      .eq('user_email', user_email)
      .single();

    if (emailError || !email) {
      console.error('Email not found in local DB:', emailError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Email not found in local database. Please sync emails first.' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract data from DB
    const email_uid = email.message_id;
    const subject = email.subject || '';
    const body_text = email.body_text || '';
    const from_email = email.from_email || '';
    const folder_name = email.cartella || 'INBOX';

    console.log('✅ Email fetched from DB:', {
      email_id,
      email_uid,
      subject: subject.substring(0, 50),
      from_email
    });

    // Recupera configurazione AI attiva
    const { data: aiConfig, error: configError } = await supabase
      .from('config_ai')
      .select('*')
      .eq('attivo', true)
      .order('provider', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (configError || !aiConfig) {
      throw new Error('Nessuna configurazione AI attiva trovata');
    }

    console.log('🤖 Using AI config:', { provider: aiConfig.provider, model: aiConfig.modello });

    // Step 1: Verifica se mittente ha categoria predefinita nel DB backup
    let predefinedCategory = force_category;
    let isVerified = force_category !== null;

    if (!force_category) {
      const { data: senderRule } = await supabase
        .from('email_sender_rules')
        .select('assigned_group:email_groups(nome_gruppo)')
        .eq('sender_email', from_email)
        .maybeSingle();

      if (senderRule?.assigned_group) {
        predefinedCategory = senderRule.assigned_group.nome_gruppo;
        isVerified = true;
        console.log('✅ Categoria predefinita trovata:', predefinedCategory);
      }
    }

    let category = predefinedCategory;
    let confidence = 1.0; // Confidence as decimal (0.0-1.0), not percentage
    let summary = '';
    let keywords: string[] = [];

    // Step 2: Se nessuna categoria predefinita, chiama AI
    if (!predefinedCategory) {
      console.log('🤖 Nessuna categoria predefinita, chiamo AI...');

      // FASE 1.2: Carica prompt da DB (chat_laboratory_composed_prompts)
      const { data: promptData, error: promptError } = await supabase
        .from('chat_laboratory_composed_prompts')
        .select('content')
        .eq('target_agent', 'email_classifier')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Fallback al prompt hardcoded se non trovato nel DB
      const systemPrompt = promptData?.content || `Sei un assistente AI specializzato nella classificazione automatica di email per un'azienda di trasporti e spedizioni internazionali.

CATEGORIE DISPONIBILI:
1. Fatture - Fatture, invoices, ricevute fiscali
2. Bolle / Packing List - DDT, bolle di accompagnamento, packing list
3. Preventivi / Quotazioni - Richieste preventivo, quotazioni, offerte commerciali
4. Rate Aeree / Rate Navali - Tariffe trasporto, rate shipping
5. Documenti Spedizione - AWB, Bill of Lading, tracking, customs
6. Offerte di Lavoro - Job posting, recruiting, carriere
7. Marketing / Pubblicità - Newsletter, promozioni, advertising
8. Spam / Non Rilevante - Spam, phishing, contenuti irrilevanti

Analizza il contenuto dell'email e classifica nella categoria più appropriata. Fornisci anche un riassunto conciso (max 100 parole) e 3-5 keywords rilevanti.`;

      if (promptError) {
        console.warn('⚠️ Error loading prompt from DB, using fallback:', promptError);
      } else if (promptData) {
        console.log('✅ Using prompt from DB (email_classifier)');
      } else {
        console.log('⚠️ No prompt found in DB, using hardcoded fallback');
      }

      const userPrompt = `Email da classificare:
Mittente: ${from_email}
Oggetto: ${subject || 'Nessun oggetto'}
Corpo: ${body_text?.substring(0, 1000) || 'Nessun contenuto'}`;

      const tools = [{
        type: 'function',
        function: {
          name: 'classify_email',
          description: 'Classifica email in una categoria specifica',
          parameters: {
            type: 'object',
            properties: {
              category: {
                type: 'string',
                enum: [
                  'Fatture',
                  'Bolle / Packing List',
                  'Preventivi / Quotazioni',
                  'Rate Aeree / Marittime',
                  'Documenti Spedizione',
                  'Tracking & Status Updates',
                  'Booking Requests',
                  'Customer Service',
                  'Offerte di Lavoro',
                  'Marketing / Newsletter',
                  'Spam / Non Rilevante'
                ],
                description: 'Categoria email'
              },
              confidence: {
                type: 'number',
                description: 'Confidenza classificazione (0-100)'
              },
              summary: {
                type: 'string',
                description: 'Riassunto conciso email (max 100 parole)'
              },
              keywords: {
                type: 'array',
                items: { type: 'string' },
                description: 'Keywords rilevanti (3-5)'
              },
              alternative_categories: {
                type: 'array',
                items: { type: 'string' },
                description: 'Categorie alternative se incerto (opzionale)'
              },
              detected_patterns: {
                type: 'array',
                items: { type: 'string' },
                description: 'Pattern rilevati come AWB, IATA codes, container numbers (opzionale)'
              },
              urgency: {
                type: 'string',
                enum: ['critical', 'high', 'normal', 'low'],
                description: 'Livello urgenza percepito (opzionale)'
              },
              action_suggested: {
                type: 'string',
                description: 'Azione consigliata se ovvia (opzionale)'
              },
              reasoning: {
                type: 'string',
                description: 'Breve spiegazione della scelta (1-2 frasi, opzionale)'
              }
            },
            required: ['category', 'confidence', 'summary', 'keywords']
          }
        }
      }];

      let aiData;

      // Chiamata API in base al provider
      if (aiConfig.provider === 'openai') {
        // OpenAI diretto
        const apiKey = aiConfig.api_key;
        if (!apiKey) throw new Error('API key OpenAI mancante');

        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: aiConfig.modello,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            tools,
            tool_choice: { type: 'function', function: { name: 'classify_email' } },
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error('❌ OpenAI API Error:', aiResponse.status, errorText);
          throw new Error(`OpenAI API error: ${aiResponse.status} - ${errorText}`);
        }

        aiData = await aiResponse.json();

      } else if (aiConfig.provider === 'anthropic') {
        // Anthropic Claude
        const apiKey = aiConfig.api_key;
        if (!apiKey) throw new Error('API key Anthropic mancante');

        const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
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
            messages: [
              { role: 'user', content: userPrompt }
            ],
            tools: tools.map(t => ({
              name: t.function.name,
              description: t.function.description,
              input_schema: t.function.parameters
            })),
            tool_choice: { type: 'tool', name: 'classify_email' }
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error('❌ Anthropic API Error:', aiResponse.status, errorText);
          throw new Error(`Anthropic API error: ${aiResponse.status} - ${errorText}`);
        }

        const claudeData = await aiResponse.json();
        
        // Converti formato Anthropic a OpenAI-like
        const toolUse = claudeData.content?.find((c: any) => c.type === 'tool_use');
        if (toolUse) {
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
        } else {
          throw new Error('No tool use in Claude response');
        }

      } else if (aiConfig.provider === 'lovable' || aiConfig.provider === 'google') {
        // Lovable AI Gateway (Gemini)
        const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
        if (!lovableApiKey) throw new Error('LOVABLE_API_KEY non configurata');

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: aiConfig.modello,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            tools,
            tool_choice: { type: 'function', function: { name: 'classify_email' } },
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error('❌ Lovable AI Error:', aiResponse.status, errorText);
          throw new Error(`Lovable AI error: ${aiResponse.status} - ${errorText}`);
        }

        aiData = await aiResponse.json();

      } else {
        throw new Error(`Provider non supportato: ${aiConfig.provider}`);
      }

      console.log('✅ AI Response:', JSON.stringify(aiData));

      const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
      if (!toolCall) {
        throw new Error('No tool call in AI response');
      }

      const classification = JSON.parse(toolCall.function.arguments);
      category = classification.category;
      confidence = classification.confidence / 100; // Convert from 0-100 to 0.0-1.0
      summary = classification.summary;
      keywords = classification.keywords;

      // ✅ Estrai campi opzionali (FASE 1)
      const alternative_categories = classification.alternative_categories || null;
      const detected_patterns = classification.detected_patterns || null;
      const urgency = classification.urgency || null;
      const action_suggested = classification.action_suggested || null;
      const reasoning = classification.reasoning || null;

      // Log per analisi (non salvato in DB per ora)
      if (detected_patterns || urgency || action_suggested || reasoning) {
        console.log('🔍 AI Insights:', {
          alternative_categories,
          detected_patterns,
          urgency,
          action_suggested,
          reasoning: reasoning?.substring(0, 100)
        });
      }

      console.log('📊 Classificazione AI:', { category, confidence, keywords });
    } else {
      // Usa categoria predefinita, ma genera comunque summary/keywords se disponibili
      summary = `Email da ${from_email} - ${subject || 'Nessun oggetto'}`;
      keywords = [from_email.split('@')[1] || from_email];
    }

    // Step 3: Estrai dominio mittente
    const senderDomain = from_email.split('@')[1]?.toLowerCase() || '';

    // Step 4: Salva classificazione nel DB con email_id FK
    const { data: insertData, error: insertError } = await supabase
      .from('email_ai_classifications')
      .upsert({
        email_id,         // ✅ FK to email_messages(id)
        email_uid,        // ✅ Keep for backward compatibility
        folder_name,
        user_email,
        subject,          // ✅ Save subject for quick access
        sender_email: from_email,
        sender_domain: senderDomain,
        category,
        confidence,
        ai_summary: summary,
        keywords,
        is_verified: isVerified,
        sender_logo_url: null, // Sarà aggiornato in background
      }, {
        onConflict: 'email_id',  // ✅ Use email_id as unique key
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ DB Insert Error:', insertError);
      throw insertError;
    }

    console.log('✅ Classificazione salvata:', insertData.id);

    return new Response(
      JSON.stringify({
        success: true,
        classification: insertData,
        used_predefined_category: predefinedCategory !== null
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('❌ Error in classify-email-content-intelligent:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
