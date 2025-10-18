import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Recupera tasso di cambio USD/EUR da API pubblica
    const exchangeResponse = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    const exchangeData = await exchangeResponse.json();
    const usdToEurRate = exchangeData.rates?.EUR || 0.95;
    
    console.log(`💱 Tasso USD→EUR aggiornato: $1 = €${usdToEurRate.toFixed(4)}`);

    // 2. Prezzi ufficiali in USD (dalla tabella utente, già convertiti in EUR con rate iniziale 0.95)
    const officialPricesEUR = [
      // OpenAI
      { provider: 'openai', model: 'gpt-5-2025-08-07', inputEUR: 2.50, outputEUR: 10.00 },
      { provider: 'openai', model: 'gpt-5-mini-2025-08-07', inputEUR: 0.15, outputEUR: 0.60 },
      { provider: 'openai', model: 'gpt-5-nano-2025-08-07', inputEUR: 0.04, outputEUR: 0.16 },
      { provider: 'openai', model: 'gpt-4.1-2025-04-14', inputEUR: 2.00, outputEUR: 8.00 },
      { provider: 'openai', model: 'o3-2025-04-16', inputEUR: 10.00, outputEUR: 40.00 },
      { provider: 'openai', model: 'o4-mini-2025-04-16', inputEUR: 1.00, outputEUR: 4.00 },
      
      // Anthropic
      { provider: 'anthropic', model: 'claude-sonnet-4-5', inputEUR: 3.00, outputEUR: 15.00 },
      { provider: 'anthropic', model: 'claude-opus-4-1-20250805', inputEUR: 15.00, outputEUR: 75.00 },
      { provider: 'anthropic', model: 'claude-sonnet-4-20250514', inputEUR: 3.00, outputEUR: 15.00 },
      { provider: 'anthropic', model: 'claude-3-5-haiku-20241022', inputEUR: 0.80, outputEUR: 4.00 },
      
      // Gemini = sempre free
      { provider: 'google', model: 'gemini-2.5-flash', inputEUR: 0, outputEUR: 0, free: true },
      { provider: 'google', model: 'gemini-2.5-pro', inputEUR: 0, outputEUR: 0, free: true },
      { provider: 'google', model: 'gemini-2.5-flash-lite', inputEUR: 0, outputEUR: 0, free: true },
      { provider: 'lovable', model: 'google/gemini-2.5-flash', inputEUR: 0, outputEUR: 0, free: true },
      { provider: 'lovable', model: 'google/gemini-2.5-pro', inputEUR: 0, outputEUR: 0, free: true },
      { provider: 'lovable', model: 'google/gemini-2.5-flash-lite', inputEUR: 0, outputEUR: 0, free: true },
    ];

    // 3. Aggiorna prezzi con nuovo tasso (per modelli non-free)
    let updatedCount = 0;
    for (const price of officialPricesEUR) {
      // Ricalcola con nuovo tasso USD/EUR (solo per modelli a pagamento)
      const adjustmentFactor = usdToEurRate / 0.95; // Rate attuale vs rate iniziale
      const costInputEur = price.free ? 0 : price.inputEUR * adjustmentFactor;
      const costOutputEur = price.free ? 0 : price.outputEUR * adjustmentFactor;
      
      const { error } = await supabaseClient
        .from('ai_pricing_config')
        .upsert({
          provider: price.provider,
          model: price.model,
          cost_input_eur: costInputEur,
          cost_output_eur: costOutputEur,
          is_free: price.free || false,
          usd_eur_rate: usdToEurRate,
          last_sync_at: new Date().toISOString()
        }, { onConflict: 'provider,model' });
      
      if (!error) {
        updatedCount++;
        console.log(`✅ ${price.provider}/${price.model}: €${costInputEur.toFixed(4)}/€${costOutputEur.toFixed(4)} ${price.free ? '(FREE)' : ''}`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `${updatedCount} prezzi aggiornati con tasso USD/EUR ${usdToEurRate.toFixed(4)}`,
      usdToEurRate
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Errore sincronizzazione:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
