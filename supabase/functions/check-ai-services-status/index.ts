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

    // Test each service with timeout
    const timeout = 5000;
    
    const [anthropicStatus, openaiStatus, lovableStatus] = await Promise.all([
      checkAnthropic(timeout),
      checkOpenAI(timeout),
      checkLovableAI(timeout)
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

async function checkAnthropic(timeoutMs: number): Promise<boolean> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    console.log('⚠️ ANTHROPIC_API_KEY not configured');
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

async function checkOpenAI(timeoutMs: number): Promise<boolean> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    console.log('⚠️ OPENAI_API_KEY not configured');
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

async function checkLovableAI(timeoutMs: number): Promise<boolean> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) {
    console.log('⚠️ LOVABLE_API_KEY not configured');
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
