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
    const { 
      email_uid, 
      folder_name = 'INBOX',
      subject, 
      body_text, 
      from_email, 
      user_email,
      force_category = null // Categoria forzata dall'utente
    } = await req.json();

    console.log('📧 Classificazione Intelligente Email:', { email_uid, folder_name, from_email, force_category });

    if (!email_uid || !from_email || !user_email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email_uid, from_email, user_email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

      const systemPrompt = `Sei un assistente AI specializzato nella classificazione automatica di email per un'azienda di trasporti e spedizioni internazionali.

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
                  'Rate Aeree / Rate Navali',
                  'Documenti Spedizione',
                  'Offerte di Lavoro',
                  'Marketing / Pubblicità',
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

      console.log('📊 Classificazione AI:', { category, confidence, keywords });
    } else {
      // Usa categoria predefinita, ma genera comunque summary/keywords se disponibili
      summary = `Email da ${from_email} - ${subject || 'Nessun oggetto'}`;
      keywords = [from_email.split('@')[1] || from_email];
    }

    // Step 3: Estrai dominio mittente
    const senderDomain = from_email.split('@')[1]?.toLowerCase() || '';

    // Step 4: Salva classificazione nel DB
    const { data: insertData, error: insertError } = await supabase
      .from('email_ai_classifications')
      .upsert({
        email_uid,
        folder_name,
        user_email,
        sender_email: from_email,
        sender_domain: senderDomain,
        category,
        confidence,
        ai_summary: summary,
        keywords,
        is_verified: isVerified,
        sender_logo_url: null, // Sarà aggiornato in background
      }, {
        onConflict: 'email_uid,user_email',
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
