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
    console.log('🔍 Checking AI services status...');

    // Leggi API keys dal database CRM (config_ai)
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.58.0');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: aiConfigs } = await supabase
      .from('config_ai')
      .select('provider, api_key')
      .eq('attivo', true);

    const anthropicKey = aiConfigs?.find(c => c.provider === 'anthropic')?.api_key;
    const openaiKey = aiConfigs?.find(c => c.provider === 'openai')?.api_key;
    const lovableKey = Deno.env.get('LOVABLE_API_KEY'); // Questa rimane da Supabase Secrets (corretto)

    // Test each service with timeout
    const timeout = 5000;
    
    const [anthropicStatus, openaiStatus, lovableStatus] = await Promise.all([
      checkAnthropic(timeout, anthropicKey),
      checkOpenAI(timeout, openaiKey),
      checkLovableAI(timeout, lovableKey)
    ]);

    const result = {
      anthropic: anthropicStatus,
      openai: openaiStatus,
      lovable: lovableStatus
    };

    console.log('✅ Status check completed:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Error checking AI services:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function checkAnthropic(timeoutMs: number, apiKey: string | undefined): Promise<boolean> {
  if (!apiKey) {
    console.log('⚠️ Anthropic API key non configurata in config_ai');
    return false;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'ping' }]
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const isOk = response.ok;
    console.log(`Anthropic status: ${isOk ? '✅' : '❌'} (${response.status})`);
    return isOk;

  } catch (error: any) {
    clearTimeout(timeoutId);
    console.log('Anthropic check failed:', error.message);
    return false;
  }
}

async function checkOpenAI(timeoutMs: number, apiKey: string | undefined): Promise<boolean> {
  if (!apiKey) {
    console.log('⚠️ OpenAI API key non configurata in config_ai');
    return false;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 10
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const isOk = response.ok;
    console.log(`OpenAI status: ${isOk ? '✅' : '❌'} (${response.status})`);
    return isOk;

  } catch (error: any) {
    clearTimeout(timeoutId);
    console.log('OpenAI check failed:', error.message);
    return false;
  }
}

async function checkLovableAI(timeoutMs: number, apiKey: string | undefined): Promise<boolean> {
  if (!apiKey) {
    console.log('⚠️ LOVABLE_API_KEY non configurata (auto-provisionata da Supabase)');
    return false;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: 'ping' }]
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const isOk = response.ok;
    console.log(`Lovable AI status: ${isOk ? '✅' : '❌'} (${response.status})`);
    return isOk;

  } catch (error: any) {
    clearTimeout(timeoutId);
    console.log('Lovable AI check failed:', error.message);
    return false;
  }
}
