import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email_id, subject, body_text, from_email, user_email } = await req.json();
    
    if (!email_id || !subject || !from_email || !user_email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // System prompt specializzato per settore trasporti
    const systemPrompt = `Sei un assistente AI specializzato nella classificazione di email per un'azienda di trasporti/corrieri internazionali.

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

    const userPrompt = `Email da classificare:
Oggetto: ${subject}
Mittente: ${from_email}
Corpo: ${(body_text || '').substring(0, 1500)}

Classifica questa email fornendo categoria, confidence (0-1), riassunto breve e keywords.`;

    // Call Lovable AI con tool calling per output strutturato
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [{
          type: "function",
          function: {
            name: "classify_email",
            description: "Classifica email in categorie predefinite",
            parameters: {
              type: "object",
              properties: {
                category: {
                  type: "string",
                  enum: [
                    "Fatture",
                    "Bolle / Packing List",
                    "Preventivi / Quotazioni",
                    "Rate Aeree / Rate Navali",
                    "Documenti Spedizione",
                    "Offerte di Lavoro",
                    "Marketing / Pubblicità",
                    "Spam / Non Rilevante"
                  ]
                },
                confidence: {
                  type: "number",
                  minimum: 0,
                  maximum: 1
                },
                summary: {
                  type: "string",
                  maxLength: 200
                },
                keywords: {
                  type: "array",
                  items: { type: "string" },
                  minItems: 3,
                  maxItems: 5
                }
              },
              required: ["category", "confidence", "summary", "keywords"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "classify_email" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded" }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error("Invalid AI response format");
    }

    const classification = JSON.parse(toolCall.function.arguments);

    // Estrai dominio mittente
    const domain = from_email.split('@')[1]?.toLowerCase() || '';

    // Salva classificazione in DB
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: insertError } = await supabase
      .from('email_ai_classifications')
      .upsert({
        email_message_id: email_id,
        user_email: user_email,
        category: classification.category,
        confidence: classification.confidence,
        ai_summary: classification.summary,
        keywords: classification.keywords,
        sender_email: from_email,
        sender_domain: domain
      }, {
        onConflict: 'email_message_id,user_email'
      });

    if (insertError) {
      console.error("DB insert error:", insertError);
      throw insertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        classification: {
          category: classification.category,
          confidence: classification.confidence,
          summary: classification.summary,
          keywords: classification.keywords
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});