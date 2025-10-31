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

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    let confidence = 100;
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

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          tools: [{
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
          }],
          tool_choice: { type: 'function', function: { name: 'classify_email' } },
          temperature: 0.3
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error('❌ AI API Error:', aiResponse.status, errorText);
        throw new Error(`AI API error: ${aiResponse.status} - ${errorText}`);
      }

      const aiData = await aiResponse.json();
      console.log('✅ AI Response:', JSON.stringify(aiData));

      const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
      if (!toolCall) {
        throw new Error('No tool call in AI response');
      }

      const classification = JSON.parse(toolCall.function.arguments);
      category = classification.category;
      confidence = classification.confidence;
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
