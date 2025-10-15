import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FoldersRequest {
  user_email?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📁 TMWE Email Folders - START');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const { user_email }: FoldersRequest = await req.json();
    console.log('👤 User email:', user_email);

    // Get OAuth token
    let oauthToken = Deno.env.get('TMWE_OAUTH_TOKEN');
    
    if (!oauthToken && user_email) {
      console.log('🔍 Recupero token da user_tmwe_credentials...');
      const { data: credentials, error: credError } = await supabase
        .from('user_tmwe_credentials')
        .select('access_token, expires_at')
        .eq('email', user_email)
        .maybeSingle();
      
      if (credError) {
        console.error('❌ Errore recupero credenziali:', credError);
      }
      
      if (credentials?.access_token) {
        const now = Date.now();
        const expiresAt = credentials.expires_at ? new Date(credentials.expires_at).getTime() : now + 3600000;
        
        if (expiresAt > now) {
          oauthToken = credentials.access_token;
          console.log('✅ Token recuperato da user_tmwe_credentials');
        } else {
          console.warn('⚠️ Token scaduto');
        }
      }
    }
    
    if (!oauthToken) {
      throw new Error('TMWE OAuth token non configurato. Configurare TMWE_OAUTH_TOKEN o user_tmwe_credentials.');
    }

    // Call TMWE API via proxy
    console.log('📞 Chiamata API via tmwe-api-proxy...');
    const { data: apiResponse, error: proxyError } = await supabase.functions.invoke('tmwe-api-proxy', {
      body: {
        endpoint: '/email_folder',
        data: {
          handler: 'get_folders'
        },
        bearerToken: oauthToken
      }
    });

    if (proxyError) {
      console.error('❌ Errore proxy:', proxyError);
      throw new Error(`API Proxy error: ${proxyError.message}`);
    }

    // API ritorna { folders: [ { name, total_messages, unread_messages } ] }
    console.log('📊 RISPOSTA API:', JSON.stringify(apiResponse, null, 2));

    const folders = apiResponse?.folders || [];
    console.log(`✅ Recuperate ${folders.length} cartelle`);

    // Return folders
    return new Response(JSON.stringify({
      success: true,
      folders: folders
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('❌ ERRORE tmwe-email-folders:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto',
      folders: []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
