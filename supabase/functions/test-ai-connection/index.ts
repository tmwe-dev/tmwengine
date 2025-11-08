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
    const { configId } = await req.json();

    if (!configId) {
      return new Response(
        JSON.stringify({ error: 'configId è richiesto' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Inizializza Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Carica configurazione
    const { data: config, error: configError } = await supabase
      .from('config_ai')
      .select('*')
      .eq('id', configId)
      .single();

    if (configError || !config) {
      return new Response(
        JSON.stringify({ error: 'Configurazione non trovata' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Aggiorna stato a pending
    await supabase
      .from('config_ai')
      .update({ last_test_status: 'pending', last_test_at: new Date().toISOString() })
      .eq('id', configId);

    const startTime = Date.now();
    let testResult: any;

    try {
      // Esegui test in base al provider
      if (config.provider === 'lovable') {
        testResult = await testLovableAI(config.modello);
      } else if (config.provider === 'openai') {
        testResult = await testOpenAI(config.api_key, config.modello);
      } else if (config.provider === 'anthropic') {
        testResult = await testAnthropic(config.api_key, config.modello);
      } else if (config.provider === 'google') {
        testResult = await testGoogleAI(config.api_key, config.modello);
      } else {
        testResult = { success: false, error: 'Provider non supportato per il test' };
      }

      const latency = Date.now() - startTime;

      // Aggiorna risultato test nel database
      await supabase
        .from('config_ai')
        .update({
          last_test_status: testResult.success ? 'success' : 'failed',
          last_test_error: testResult.error || null,
          last_test_at: new Date().toISOString()
        })
        .eq('id', configId);

      return new Response(
        JSON.stringify({
          success: testResult.success,
          latency,
          error: testResult.error,
          provider: config.provider,
          model: config.modello
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error: any) {
      const latency = Date.now() - startTime;
      
      await supabase
        .from('config_ai')
        .update({
          last_test_status: 'failed',
          last_test_error: error.message,
          last_test_at: new Date().toISOString()
        })
        .eq('id', configId);

      return new Response(
        JSON.stringify({
          success: false,
          latency,
          error: error.message,
          provider: config.provider,
          model: config.modello
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('Errore test-ai-connection:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function testLovableAI(model: string) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    return { success: false, error: 'LOVABLE_API_KEY non configurata' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'user', content: 'Test di connessione. Rispondi semplicemente "OK".' }
        ],
        max_tokens: 10
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.status === 429) {
      return { success: false, error: 'Rate limit raggiunto. Riprova più tardi.' };
    }
    if (response.status === 402) {
      return { success: false, error: 'Crediti esauriti. Aggiungi crediti al workspace.' };
    }
    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    const data = await response.json();
    if (data.choices?.[0]?.message?.content) {
      return { success: true };
    }
    return { success: false, error: 'Risposta non valida dal modello' };

  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      return { success: false, error: 'Timeout: endpoint non risponde' };
    }
    return { success: false, error: error.message };
  }
}

async function testOpenAI(apiKey: string, model: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    // GPT-5 e modelli nuovi usano max_completion_tokens, non max_tokens
    const isNewModel = model.startsWith('gpt-5') || model.startsWith('o3') || model.startsWith('o4');
    
    const requestBody: any = {
      model: model,
      messages: [
        { role: 'user', content: 'Test di connessione. Rispondi "OK".' }
      ]
    };

    if (isNewModel) {
      requestBody.max_completion_tokens = 10;
    } else {
      requestBody.max_tokens = 10;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.status === 401) {
      return { success: false, error: 'API Key non valida' };
    }
    if (response.status === 429) {
      return { success: false, error: 'Rate limit raggiunto' };
    }
    if (response.status === 404) {
      return { success: false, error: 'Modello non trovato' };
    }
    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    const data = await response.json();
    console.log('OpenAI Response:', JSON.stringify(data, null, 2));
    
    if (data.choices && Array.isArray(data.choices) && data.choices.length > 0) {
      console.log('OpenAI test successful, response:', data.choices[0]);
      return { success: true };
    }
    
    console.error('OpenAI parsing failed. Full response:', data);
    return { success: false, error: 'Risposta non valida: ' + JSON.stringify(data) };

  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      return { success: false, error: 'Timeout: endpoint non risponde' };
    }
    return { success: false, error: error.message };
  }
}

async function testAnthropic(apiKey: string, model: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 10,
        messages: [
          { role: 'user', content: 'Test di connessione. Rispondi "OK".' }
        ]
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.status === 401) {
      const errorBody = await response.text();
      console.error('❌ Anthropic 401 Error Body:', errorBody);
      
      let errorDetail = 'API Key non valida';
      try {
        const parsed = JSON.parse(errorBody);
        if (parsed.error?.message) {
          errorDetail = parsed.error.message;
        }
      } catch {}
      
      return { success: false, error: `Auth Error: ${errorDetail}` };
    }
    if (response.status === 429) {
      return { success: false, error: 'Rate limit raggiunto' };
    }
    if (response.status === 404) {
      return { success: false, error: 'Modello non trovato' };
    }
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Anthropic HTTP ${response.status}:`, errorText);
      
      let errorMessage = errorText;
      try {
        const parsed = JSON.parse(errorText);
        if (parsed.error?.message) {
          errorMessage = parsed.error.message;
        }
      } catch {}
      
      return { success: false, error: `HTTP ${response.status}: ${errorMessage}` };
    }

    const data = await response.json();
    console.log('Anthropic Response:', JSON.stringify(data, null, 2));
    
    if (data.content && Array.isArray(data.content) && data.content.length > 0) {
      console.log('Anthropic test successful, response:', data.content[0]);
      return { success: true };
    }
    
    console.error('Anthropic parsing failed. Full response:', data);
    return { success: false, error: 'Risposta non valida: ' + JSON.stringify(data) };

  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      return { success: false, error: 'Timeout: endpoint non risponde' };
    }
    return { success: false, error: error.message };
  }
}

async function testGoogleAI(apiKey: string, model: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: 'Test di connessione. Rispondi "OK".' }]
          }]
        }),
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    if (response.status === 401 || response.status === 403) {
      return { success: false, error: 'API Key non valida' };
    }
    if (response.status === 429) {
      return { success: false, error: 'Rate limit raggiunto' };
    }
    if (response.status === 404) {
      return { success: false, error: 'Modello non trovato' };
    }
    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    const data = await response.json();
    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      return { success: true };
    }
    return { success: false, error: 'Risposta non valida' };

  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      return { success: false, error: 'Timeout: endpoint non risponde' };
    }
    return { success: false, error: error.message };
  }
}
