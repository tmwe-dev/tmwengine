import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversationId, type = 'summary', conversationText } = await req.json();
    // type: 'summary' | 'full_report' | 'title_and_summary'
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    let prompt: string;
    let maxTokens: number;
    let model: string;
    
    // Tipo title_and_summary - per auto-generazione
    if (type === 'title_and_summary') {
      prompt = `Analizza l'inizio di questa conversazione e genera:
1. Un titolo descrittivo (max 60 caratteri)
2. Un breve riassunto (max 100 caratteri)

Conversazione:
${conversationText}

Rispondi SOLO in formato JSON puro senza markdown:
{"title": "...", "summary": "..."}`;
      
      maxTokens = 100;
      model = 'google/gemini-2.0-flash-lite';
      
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          max_completion_tokens: maxTokens,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI API error: ${errorText}`);
      }

      const aiData = await response.json();
      const result = aiData.choices[0].message.content.trim();
      
      // Parse JSON
      const parsed = JSON.parse(result.replace(/```json\n?|```/g, ''));
      
      return new Response(
        JSON.stringify({ success: true, title: parsed.title, summary: parsed.summary }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Recupera messaggi
    const limit = type === 'summary' ? 20 : 1000;
    const { data: messages } = await supabase
      .from('chat_laboratory_messages')
      .select('sender_name, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (!messages || messages.length === 0) {
      throw new Error('Nessun messaggio trovato');
    }
    
    // Costruisci conversazione
    const conversationTextFromDB = messages
      .reverse()
      .map(m => `${m.sender_name}: ${m.content}`)
      .join('\n\n');
    
    if (type === 'summary') {
      prompt = `Analizza questa conversazione e crea un riassunto di 2 righe (massimo 100 caratteri) che descriva l'argomento principale e i punti chiave discussi.

Conversazione:
${conversationTextFromDB}

Riassunto (max 100 caratteri):`;
      maxTokens = 50;
      model = 'google/gemini-2.0-flash-lite';
    } else {
      // full_report
      prompt = `Genera un report dettagliato e ben formattato di questa conversazione multi-agente.

Il report deve includere:
1. Titolo della discussione
2. Data e partecipanti
3. Sommario esecutivo (3-4 righe)
4. Punti chiave discussi (bullet points)
5. Decisioni prese o conclusioni
6. Eventuali azioni future suggerite

Usa Markdown per la formattazione.

Conversazione:
${conversationTextFromDB}

Report:`;
      maxTokens = 1500;
      model = 'openai/gpt-5-mini';
    }
    
    // Chiama Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        max_completion_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI API error: ${errorText}`);
    }

    const aiData = await response.json();
    const result = aiData.choices[0].message.content.trim();
    
    // Salva risultato
    if (type === 'summary') {
      await supabase
        .from('chat_laboratory_conversations')
        .update({ 
          riassunto_contesto: result,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);
      
      return new Response(
        JSON.stringify({ success: true, summary: result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Per report completo, restituisci il markdown
      return new Response(
        JSON.stringify({ success: true, report: result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
