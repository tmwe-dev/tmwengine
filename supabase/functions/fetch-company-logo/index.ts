// ============================================
// EDGE FUNCTION: Recupero Automatico Logo Aziendale
// Cerca logo via Clearbit/Google/Favicon e salva in cache
// ============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { domain } = await req.json();
    console.log(`[fetch-company-logo] Ricerca logo per: ${domain}`);

    if (!domain || typeof domain !== 'string') {
      throw new Error('Domain parameter required');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 🔍 CHECK: esiste già in cache?
    const { data: existing } = await supabase
      .from('company_logos')
      .select('*')
      .eq('domain', domain.toLowerCase())
      .maybeSingle();

    if (existing?.logo_url) {
      console.log(`[fetch-company-logo] ✅ Cache hit: ${domain}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          logo_url: existing.logo_url,
          source: 'cache' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 🌐 FETCH: Prova più provider HIGH RES
    let logoUrl: string | null = null;
    let source = 'not_found';

    // 1️⃣ Clearbit Logo API HD (size=256)
    try {
      const clearbitUrl = `https://logo.clearbit.com/${domain}?size=256`;
      const response = await fetch(clearbitUrl, { 
        method: 'HEAD',
        redirect: 'follow' 
      });
      if (response.ok) {
        logoUrl = clearbitUrl;
        source = 'clearbit';
        console.log(`[fetch-company-logo] ✅ Clearbit HD: ${logoUrl}`);
      }
    } catch (e) {
      console.log(`[fetch-company-logo] ⚠️ Clearbit failed: ${e}`);
    }

    // 2️⃣ Google S2 Favicon API HD (size=128)
    if (!logoUrl) {
      logoUrl = `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=128`;
      source = 'favicon';
      console.log(`[fetch-company-logo] ℹ️ Fallback to Google S2 HD: ${logoUrl}`);
    }

    // 💾 SAVE: Salva in cache
    const { error: upsertError } = await supabase
      .from('company_logos')
      .upsert({
        domain: domain.toLowerCase(),
        logo_url: logoUrl,
        fetched_at: new Date().toISOString()
      }, {
        onConflict: 'domain'
      });

    if (upsertError) {
      console.error(`[fetch-company-logo] ❌ Cache save error:`, upsertError);
    } else {
      console.log(`[fetch-company-logo] 💾 Salvato in cache: ${domain}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        logo_url: logoUrl,
        source 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[fetch-company-logo] ❌ Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
