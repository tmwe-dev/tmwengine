import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_message, ai_config_id } = await req.json();

    if (!user_message || !ai_config_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_message, ai_config_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Recupera configurazione AI
    const { data: aiConfig, error: configError } = await supabase
      .from('config_ai')
      .select('*')
      .eq('id', ai_config_id)
      .single();

    if (configError || !aiConfig) {
      console.error('AI config error:', configError);
      return new Response(
        JSON.stringify({ error: 'AI configuration not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiProvider = aiConfig.provider || 'openai';
    const model = aiConfig.model || 'gpt-4o-mini';

    let response;
    
    if (aiProvider === 'openai') {
      const apiKey = aiConfig.api_key || Deno.env.get('OPENAI_API_KEY');
      
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'system',
              content: `Sei un assistente AI esperto di email automation. 
              
Aiuti gli utenti a:
- Analizzare email e capire il contenuto
- Creare regole di automazione intelligenti
- Suggerire azioni appropriate (archiviare, inoltrare, rispondere, etc.)
- Ottimizzare la gestione della posta

Rispondi sempre in italiano, in modo chiaro e conciso. Se suggerisci azioni automatiche, spiega sempre il ragionamento.`
            },
            { role: 'user', content: user_message }
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', response.status, errorText);
        return new Response(
          JSON.stringify({ error: `OpenAI API error: ${response.status}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;

      return new Response(
        JSON.stringify({ response: aiResponse }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      return new Response(
        JSON.stringify({ error: `Provider ${aiProvider} not supported yet` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});