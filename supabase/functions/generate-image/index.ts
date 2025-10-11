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
    const { prompt, configId } = await req.json();

    if (!prompt || !configId) {
      throw new Error('Prompt e configId sono richiesti');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Recupera configurazione AI
    const { data: config, error: configError } = await supabaseClient
      .from('config_ai')
      .select('*')
      .eq('id', configId)
      .eq('attivo', true)
      .single();

    if (configError || !config) {
      throw new Error('Configurazione AI non trovata o non attiva');
    }

    console.log(`Generazione immagine con ${config.provider} - ${config.modello}`);

    let imageUrl: string;

    // LOVABLE AI GATEWAY (Google Gemini Nano Banana)
    if (config.provider === 'lovable') {
      const lovableKey = Deno.env.get('LOVABLE_API_KEY');
      if (!lovableKey) {
        throw new Error('LOVABLE_API_KEY non configurata');
      }

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-image-preview',
          messages: [{ role: 'user', content: prompt }],
          modalities: ['image', 'text']
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Lovable AI error:', errorText);
        throw new Error(`Errore Lovable AI: ${response.status}`);
      }

      const data = await response.json();
      imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (!imageUrl) {
        throw new Error('Nessuna immagine generata da Lovable AI');
      }
    }
    // OPENAI
    else if (config.provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.modello.includes('image') ? config.modello : 'gpt-image-1',
          prompt: prompt,
          n: 1,
          size: '1024x1024',
          response_format: 'b64_json'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI error:', errorText);
        throw new Error(`Errore OpenAI: ${response.status}`);
      }

      const data = await response.json();
      const b64Image = data.data?.[0]?.b64_json;
      
      if (!b64Image) {
        throw new Error('Nessuna immagine generata da OpenAI');
      }

      imageUrl = `data:image/png;base64,${b64Image}`;
    }
    // HUGGINGFACE
    else if (config.provider === 'huggingface') {
      const response = await fetch(
        `https://api-inference.huggingface.co/models/${config.modello || 'black-forest-labs/FLUX.1-schnell'}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.api_key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ inputs: prompt })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('HuggingFace error:', errorText);
        throw new Error(`Errore HuggingFace: ${response.status}`);
      }

      const imageBlob = await response.blob();
      const arrayBuffer = await imageBlob.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      imageUrl = `data:image/png;base64,${base64}`;
    }
    else {
      throw new Error(`Provider ${config.provider} non supportato per generazione immagini`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        imageUrl,
        provider: config.provider,
        model: config.modello
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Errore generate-image:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Errore sconosciuto' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
