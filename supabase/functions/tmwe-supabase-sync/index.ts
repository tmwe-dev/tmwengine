import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncRequest {
  tmweEmail: string;
  tmweProfile?: {
    name?: string;
    email: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tmweEmail, tmweProfile }: SyncRequest = await req.json();
    
    if (!tmweEmail) {
      return new Response(
        JSON.stringify({ error: 'Email TMWE mancante' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log(`🔄 Sincronizzazione TMWE → Supabase per: ${tmweEmail}`);

    // 1. Cerca utente Supabase esistente per email
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Errore ricerca utenti:', listError);
      throw listError;
    }

    let supabaseUser = existingUsers.users.find(u => u.email === tmweEmail);

    // 2. Se non esiste, crea nuovo utente Supabase
    if (!supabaseUser) {
      console.log(`➕ Creazione nuovo utente Supabase per: ${tmweEmail}`);
      
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: tmweEmail,
        email_confirm: true,
        user_metadata: {
          tmwe_oauth: true,
          name: tmweProfile?.name || tmweEmail.split('@')[0],
        }
      });

      if (createError) {
        console.error('Errore creazione utente:', createError);
        throw createError;
      }

      supabaseUser = newUser.user;
      console.log(`✅ Utente Supabase creato: ${supabaseUser.id}`);
    } else {
      console.log(`✅ Utente Supabase esistente trovato: ${supabaseUser.id}`);
    }

    // 3. Aggiorna/crea profilo con mapping TMWE
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        user_id: supabaseUser.id,
        tmwe_email: tmweEmail,
        display_name: tmweProfile?.name || supabaseUser.email?.split('@')[0],
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (profileError) {
      console.error('Errore aggiornamento profilo:', profileError);
      throw profileError;
    }

    console.log(`✅ Profilo sincronizzato per user_id: ${supabaseUser.id}`);

    // 4. Genera token di sessione usando magiclink (più affidabile per i token)
    console.log('🔐 Generazione token sessione...');
    
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: tmweEmail,
      options: {
        redirectTo: `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify`
      }
    });

    if (linkError) {
      console.error('Errore generazione link:', linkError);
      throw linkError;
    }

    // Verifica che abbiamo i token
    const accessToken = linkData.properties?.access_token;
    const refreshToken = linkData.properties?.refresh_token;
    
    if (!accessToken || !refreshToken) {
      console.log('⚠️ Link generato ma senza token, usando approccio alternativo');
      
      // Alternativa: crea sessione manualmente usando il JWT
      const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.createSession({
        userId: supabaseUser.id,
      });
      
      if (sessionError || !sessionData) {
        throw new Error('Impossibile creare sessione');
      }
      
      console.log('✅ Sessione creata tramite approccio alternativo');
      
      return new Response(
        JSON.stringify({
          success: true,
          supabaseUserId: supabaseUser.id,
          profile: profile,
          session: {
            access_token: sessionData.access_token,
            refresh_token: sessionData.refresh_token,
            expires_at: sessionData.expires_at,
            expires_in: sessionData.expires_in,
          },
          message: 'Sincronizzazione e sessione create con successo'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('✅ Token generati con successo');

    return new Response(
      JSON.stringify({
        success: true,
        supabaseUserId: supabaseUser.id,
        profile: profile,
        session: {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: linkData.properties.expires_at,
          expires_in: linkData.properties.expires_in || 3600,
        },
        message: 'Sincronizzazione e sessione create con successo'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('❌ Errore sincronizzazione:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Errore durante la sincronizzazione',
        details: error
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
