import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessMessageRequest {
  roomId: string;
  messageContent: string;
  sourceLanguage: string;
  targetLanguage: string;
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
        userPrompt = `Basandoti sul seguente messaggio, fornisci 3 suggerimenti brevi e contestuali per rispondere.
        
Messaggio:
"""
${messageContent}
"""

Fornisci i suggerimenti in formato JSON:
{
  "suggestions": [
    "Suggerimento 1",
    "Suggerimento 2",
    "Suggerimento 3"
  ]
}`;
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

    // Chiama Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1000
      }),
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
    const aiResult = aiData.choices?.[0]?.message?.content || '';

    console.log('AI Response:', aiResult);

    if (action === 'translate') {
      result = {
        translatedText: aiResult.trim(),
        sourceLanguage,
        targetLanguage
      };
    } else if (action === 'suggest') {
      try {
        result = JSON.parse(aiResult);
      } catch (e) {
        result = { suggestions: [aiResult] };
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
