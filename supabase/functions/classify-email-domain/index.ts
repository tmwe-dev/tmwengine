import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { domains } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Classifying domains:', domains);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Sei un classificatore di domini email. Per ogni dominio, determina:
1. Se è un provider pubblico (Gmail, Outlook, Libero, Fastmail, ecc.) → "is_provider": true
2. Il nome azienda corretto da visualizzare

Provider pubblici includono: Gmail, Outlook, Yahoo, Hotmail, Libero, Alice, Virgilio, Tiscali, ProtonMail, Zoho, Fastmail, Hey, iCloud, e simili.

Aziende reali: Apple, Barilla, Amazon, Microsoft (dominio aziendale), ecc.

Rispondi SOLO con JSON array usando la funzione classify_domains.`
          },
          {
            role: 'user',
            content: `Classifica questi domini:\n${domains.join('\n')}`
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "classify_domains",
            description: "Classifica domini email come provider pubblici o aziende",
            parameters: {
              type: "object",
              properties: {
                results: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      domain: { 
                        type: "string",
                        description: "Il dominio analizzato (es. gmail.com)"
                      },
                      is_provider: { 
                        type: "boolean",
                        description: "true se provider pubblico, false se azienda"
                      },
                      company_name: { 
                        type: "string",
                        description: "Nome azienda da visualizzare (es. 'Barilla', 'Apple')"
                      }
                    },
                    required: ["domain", "is_provider", "company_name"],
                    additionalProperties: false
                  }
                }
              },
              required: ["results"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "classify_domains" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response:', JSON.stringify(data, null, 2));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const results = JSON.parse(toolCall.function.arguments);
    console.log('Classification results:', results);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in classify-email-domain:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        results: { results: [] }
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
