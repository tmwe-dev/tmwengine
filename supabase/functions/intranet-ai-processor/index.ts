import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessMessageRequest {
  roomId: string;
  messageContent: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  writingLanguage?: string;
  action: 'translate' | 'suggest' | 'generate_audio';
  userId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY non configurata');
    }

    const { 
      roomId, 
      messageContent, 
      sourceLanguage, 
      targetLanguage,
      writingLanguage,
      action,
      userId 
    }: ProcessMessageRequest = await req.json();

    console.log('Processing message:', { roomId, action, sourceLanguage, targetLanguage });

    // Carica il prompt AI della stanza
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const roomSettingsResponse = await fetch(
      `${supabaseUrl}/rest/v1/intranet_room_ai_prompts?room_id=eq.${roomId}&select=*`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    const roomSettings = await roomSettingsResponse.json();
    let systemPrompt = '';

    if (roomSettings && roomSettings.length > 0) {
      const settings = roomSettings[0];
      
      if (settings.is_using_standard) {
        // Carica prompt standard
        const globalPromptResponse = await fetch(
          `${supabaseUrl}/rest/v1/intranet_global_ai_prompt?attivo=eq.true&select=prompt_contenuto`,
          {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
            },
          }
        );
        const globalPrompt = await globalPromptResponse.json();
        systemPrompt = globalPrompt[0]?.prompt_contenuto || '';
      } else {
        systemPrompt = settings.custom_prompt || '';
      }
    } else {
      // Default prompt
      systemPrompt = `Sei un assistente AI per la traduzione e comunicazione in tempo reale in una chat aziendale.
      
COMPITI PRINCIPALI:
1. Traduzione automatica: Traduci i messaggi tra diverse lingue mantenendo il tono e il contesto
2. Suggerimenti di risposta: Fornisci suggerimenti contestuali quando richiesto
3. Auto-speaker: Converti il testo in formato vocale quando abilitato

LINEE GUIDA:
- Mantieni sempre un tono professionale ma cordiale
- Rispetta le preferenze linguistiche di ogni utente
- Preserva formattazione, emoticon e contesto culturale
- Segnala quando una traduzione potrebbe avere multiple interpretazioni
- Non tradurre nomi propri, brand o termini tecnici specifici`;
    }

    let userPrompt = '';
    let result: any = {};
    let useTools = false;
    let tools: any[] = [];

    switch (action) {
      case 'translate':
        userPrompt = `Traduci il seguente messaggio da ${sourceLanguage} a ${targetLanguage}.
        
IMPORTANTE:
- Mantieni il tono e lo stile del messaggio originale
- Preserva emoticon e formattazione
- Non tradurre nomi propri, brand o termini tecnici
- Se ci sono ambiguità, usa l'interpretazione più comune
        
Messaggio da tradurre:
"""
${messageContent}
"""

Fornisci SOLO la traduzione, senza spiegazioni aggiuntive.`;
        break;

      case 'suggest':
        useTools = true;
        userPrompt = `Genera 3-5 suggerimenti di risposta per questa conversazione in lingua ${writingLanguage || 'italiano'}.
        
Crea suggerimenti con toni diversi (formale, informale, neutro, entusiasta) adatti a una chat professionale.`;

        tools = [
          {
            type: "function",
            function: {
              name: "provide_suggestions",
              description: "Fornisce suggerimenti di risposta per la conversazione",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        text: { 
                          type: "string",
                          description: "Il testo del suggerimento"
                        },
                        tone: { 
                          type: "string",
                          description: "Il tono del messaggio",
                          enum: ["formale", "informale", "neutro", "entusiasta"]
                        }
                      },
                      required: ["text", "tone"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["suggestions"],
                additionalProperties: false
              }
            }
          }
        ];
        break;

      case 'generate_audio':
        // Per l'audio, ritorna il testo processato che verrà poi convertito in audio dal client
        result = {
          text: messageContent,
          language: targetLanguage
        };
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // Prepara il body della richiesta
    const requestBody: any = {
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    };

    // Aggiungi tools se necessari
    if (useTools && tools.length > 0) {
      requestBody.tools = tools;
      requestBody.tool_choice = { type: "function", function: { name: "provide_suggestions" } };
    }

    // Chiama Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error('Limite di richieste raggiunto. Riprova tra qualche secondo.');
      }
      if (aiResponse.status === 402) {
        throw new Error('Crediti AI esauriti. Contatta l\'amministratore.');
      }
      
      throw new Error('Errore nella chiamata AI');
    }

    const aiData = await aiResponse.json();
    console.log('AI Response:', JSON.stringify(aiData, null, 2));

    if (action === 'translate') {
      const aiResult = aiData.choices?.[0]?.message?.content || '';
      result = {
        translatedText: aiResult.trim(),
        sourceLanguage,
        targetLanguage
      };
    } else if (action === 'suggest') {
      // Estrai i suggerimenti dalla chiamata tool
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall && toolCall.function.name === 'provide_suggestions') {
        const args = JSON.parse(toolCall.function.arguments);
        result = { suggestions: args.suggestions };
      } else {
        // Fallback
        const aiResult = aiData.choices?.[0]?.message?.content || '';
        result = { suggestions: [{ text: aiResult, tone: 'neutro' }] };
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in intranet-ai-processor:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Errore sconosciuto',
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
