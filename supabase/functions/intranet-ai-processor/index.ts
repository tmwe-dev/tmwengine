import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { roomId, message, userEmail } = await req.json();
    console.log('🤖 Processing message for room:', roomId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Carica impostazioni AI della stanza
    const { data: aiSettings } = await supabase
      .from('intranet_room_ai_prompts')
      .select('*')
      .eq('room_id', roomId)
      .single();

    if (!aiSettings?.enable_ai) {
      return new Response(JSON.stringify({ 
        shouldRespond: false,
        message: 'AI disabilitata per questa stanza'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Carica ultimi messaggi per contesto
    const { data: recentMessages } = await supabase
      .from('intranet_messages')
      .select('content, user_id')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Costruisci prompt combinato
    const systemPrompt = buildSystemPrompt(aiSettings, recentMessages || []);
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY non configurato");
    }

    console.log('📤 Chiamata a Lovable AI...');
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Messaggio da ${userEmail}: ${message}` }
        ],
        temperature: 0.7,
        max_tokens: 500
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Rate limit raggiunto, riprova più tardi" 
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ 
          error: "Crediti insufficienti, contatta l'amministratore" 
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      const errorText = await aiResponse.text();
      console.error('❌ Errore AI:', aiResponse.status, errorText);
      throw new Error(`Errore AI: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiMessage = aiData.choices?.[0]?.message?.content;

    console.log('✅ Risposta AI ricevuta');
    
    // Se moderazione abilitata, controlla se serve intervento
    if (aiSettings.enable_moderation && aiMessage) {
      const moderationCheck = await checkModerationNeeded(message, aiMessage, aiSettings);
      
      return new Response(JSON.stringify({
        shouldRespond: moderationCheck.shouldIntervene,
        response: aiMessage,
        moderationType: moderationCheck.type || null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Altrimenti rispondi solo se suggerimenti abilitati
    return new Response(JSON.stringify({
      shouldRespond: aiSettings.enable_suggestions,
      response: aiMessage
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error('❌ Errore nel processore AI:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Errore sconosciuto" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function buildSystemPrompt(aiSettings: any, recentMessages: any[]): string {
  let systemPrompt = '';
  
  // Prompt operativo/funzionale
  if (aiSettings.is_using_standard) {
    systemPrompt = `Sei un assistente AI in una chat di gruppo aziendale.

FUNZIONI OPERATIVE:
- Rispondi in modo conciso e professionale
- Fornisci suggerimenti utili quando richiesto
- Mantieni il contesto della conversazione
- Usa traduzione automatica se abilitata

`;
  } else if (aiSettings.custom_prompt) {
    systemPrompt = aiSettings.custom_prompt + '\n\n';
  }

  // Prompt di moderazione comportamentale
  if (aiSettings.enable_moderation && aiSettings.moderation_prompt) {
    systemPrompt += `\n--- REGOLE DI MODERAZIONE ---\n${aiSettings.moderation_prompt}\n\n`;
    systemPrompt += `Analizza i messaggi e intervieni SOLO se violano le regole di moderazione specificate sopra.\n`;
  }

  // Aggiungi contesto conversazione
  if (recentMessages.length > 0) {
    systemPrompt += `\nUltimi ${recentMessages.length} messaggi della chat:\n`;
    recentMessages.reverse().forEach((msg, i) => {
      systemPrompt += `${i + 1}. ${msg.content}\n`;
    });
  }

  return systemPrompt;
}

async function checkModerationNeeded(
  userMessage: string, 
  aiAnalysis: string,
  settings: any
): Promise<{ shouldIntervene: boolean; type?: string }> {
  // L'AI ha già analizzato il messaggio nel contesto delle regole di moderazione
  // Cerca keyword che indicano necessità di intervento
  const interventionKeywords = [
    'warning', 'attenzione', 'viola', 'inappropriato', 
    'offensivo', 'parolaccia', 'limite superato'
  ];

  const needsIntervention = interventionKeywords.some(keyword => 
    aiAnalysis.toLowerCase().includes(keyword)
  );

  return {
    shouldIntervene: needsIntervention,
    type: needsIntervention ? 'moderation' : undefined
  };
}