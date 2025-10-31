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
    const { domain } = await req.json();
    
    if (!domain) {
      return new Response(
        JSON.stringify({ error: 'Domain is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check cache first
    const { data: cached } = await supabase
      .from('company_logos_cache')
      .select('*')
      .eq('domain', domain)
      .single();

    if (cached && cached.fetch_attempts < 3) {
      // Cache hit
      return new Response(
        JSON.stringify({
          logo_url: cached.logo_url,
          company_name: cached.company_name,
          source: 'cache'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try Clearbit Logo API
    let logoUrl: string | null = null;
    let source = 'not_found';

    try {
      const clearbitUrl = `https://logo.clearbit.com/${domain}`;
      const clearbitResponse = await fetch(clearbitUrl, { 
        method: 'HEAD',
        redirect: 'follow'
      });

      if (clearbitResponse.ok) {
        logoUrl = clearbitUrl;
        source = 'clearbit';
      }
    } catch (e) {
      console.log("Clearbit failed, trying fallback");
    }

    // Fallback to Google Favicon
    if (!logoUrl) {
      logoUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
      source = 'favicon';
    }

    // Extract company name from domain
    const companyName = domain
      .split('.')[0]
      .replace(/^(mail|smtp|email|webmail)\./, '')
      .split(/[_-]/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    // Save to cache
    await supabase
      .from('company_logos_cache')
      .upsert({
        domain,
        logo_url: logoUrl,
        company_name: companyName,
        fetch_attempts: (cached?.fetch_attempts || 0) + 1,
        last_fetched_at: new Date().toISOString()
      }, {
        onConflict: 'domain'
      });

    return new Response(
      JSON.stringify({
        logo_url: logoUrl,
        company_name: companyName,
        source
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});