// ============================================
// EDGE FUNCTION: tmwe-jwt-sign
// ============================================
// ⚠️ NOMBRE LEGACY - Función reutilizada para evitar límite de slots
// 
// FUNCIONALIDAD ACTUAL: Migración de Email IDs
// - Pobla campo `tmwe_email_id` en tabla `email_ai_classifications`
// - Busca emails coincidentes en TMWE API por subject/sender
// - Usa OAuth tokens de user_tmwe_credentials por usuario
//
// FUNCIONALIDAD ORIGINAL (ahora en tmwe-api-proxy):
// - JWT signing → handler: internal_jwt_sign
//
// Historial:
// - 2025-11-26: Reutilizada para migración de email IDs
// - Pre-2025-11: JWT signing (consolidado en tmwe-api-proxy)
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// URL base de TMWE API (mismo que usa tmwe-api-proxy)
const TMWE_API_BASE_URL = 'https://findair.it/erp/tmwe_json';

interface MigrationResult {
  total: number;
  migrated: number;
  failed: number;
  skipped: number;
  no_oauth: number;
  errors: string[];
}

// Cache de tokens OAuth por usuario (para evitar queries repetidas)
const tokenCache = new Map<string, { token: string; expires_at: string }>();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { batch_size = 50, dry_run = false, user_email_filter = null } = await req.json().catch(() => ({}));
    
    console.log('[MIGRATE] 🚀 Starting TMWE Email ID Migration...');
    console.log('[MIGRATE] 📊 Config:', { batch_size, dry_run, user_email_filter });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Build query for classifications without tmwe_email_id
    let query = supabase
      .from('email_ai_classifications')
      .select('id, email_uid, sender_email, subject, folder_name, user_email, created_at')
      .is('tmwe_email_id', null)
      .order('created_at', { ascending: false })
      .limit(batch_size);
    
    // Opcional: filtrar por usuario específico
    if (user_email_filter) {
      query = query.eq('user_email', user_email_filter);
    }

    const { data: pendingClassifications, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch classifications: ${fetchError.message}`);
    }

    console.log(`[MIGRATE] 📧 Found ${pendingClassifications?.length || 0} classifications to migrate`);

    const result: MigrationResult = {
      total: pendingClassifications?.length || 0,
      migrated: 0,
      failed: 0,
      skipped: 0,
      no_oauth: 0,
      errors: []
    };

    if (!pendingClassifications || pendingClassifications.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No classifications pending migration',
        result
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Helper: obtener OAuth token para un usuario
    async function getOAuthToken(userEmail: string): Promise<string | null> {
      // Check cache first
      const cached = tokenCache.get(userEmail);
      if (cached && new Date(cached.expires_at) > new Date()) {
        return cached.token;
      }
      
      // Query database
      const { data: credentials, error } = await supabase
        .from('user_tmwe_credentials')
        .select('access_token, expires_at')
        .eq('email', userEmail)
        .eq('token_type', 'oauth')
        .maybeSingle();
      
      if (error || !credentials?.access_token) {
        console.log(`[MIGRATE] ⚠️ No OAuth token for user: ${userEmail}`);
        return null;
      }
      
      // Check if token expired
      if (credentials.expires_at && new Date(credentials.expires_at) < new Date()) {
        console.log(`[MIGRATE] ⚠️ OAuth token expired for user: ${userEmail}`);
        return null;
      }
      
      // Cache it
      tokenCache.set(userEmail, { 
        token: credentials.access_token, 
        expires_at: credentials.expires_at || new Date(Date.now() + 3600000).toISOString() 
      });
      
      return credentials.access_token;
    }

    // 2. Process each classification
    for (const classification of pendingClassifications) {
      try {
        // Skip if no subject to search
        if (!classification.subject || classification.subject.trim() === '') {
          result.skipped++;
          console.log(`[MIGRATE] ⏭️ Skipped (no subject): ${classification.id}`);
          continue;
        }

        // Get OAuth token for this user
        const oauthToken = await getOAuthToken(classification.user_email);
        if (!oauthToken) {
          result.no_oauth++;
          console.log(`[MIGRATE] 🔒 No OAuth for: ${classification.user_email}`);
          continue;
        }

        console.log(`[MIGRATE] 🔍 Searching for: ${classification.subject?.substring(0, 40)}...`);
        
        // Search TMWE API for matching email by subject
        // Endpoint correcto: /email_search (no /app.php?action=email_search)
        const searchResponse = await fetch(`${TMWE_API_BASE_URL}/email_search`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${oauthToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            handler: 'search_emails',
            query: classification.subject || '',
            folder: classification.folder_name || 'INBOX',
            limit: 10
          })
        });

        if (!searchResponse.ok) {
          const errorText = await searchResponse.text();
          console.log(`[MIGRATE] ⚠️ API Response (${searchResponse.status}): ${errorText.substring(0, 200)}`);
          throw new Error(`TMWE API (${searchResponse.status}): ${errorText.substring(0, 100)}`);
        }

        const searchData = await searchResponse.json();
        console.log(`[MIGRATE] 📬 API Response keys: ${Object.keys(searchData).join(', ')}`);
        
        // Try multiple response formats
        const emails = searchData?.emails || searchData?.data?.emails || searchData?.results || searchData?.messages || [];

        // Find best match by sender_email
        let bestMatch = null;
        for (const email of emails) {
          const emailSender = email.from?.email || email.from_email || email.sender || '';
          
          if (emailSender.toLowerCase() === classification.sender_email?.toLowerCase()) {
            bestMatch = email;
            break;
          }
        }

        if (bestMatch && (bestMatch.email_id || bestMatch.id || bestMatch.message_id)) {
          const tmweEmailId = parseInt(bestMatch.email_id || bestMatch.id || bestMatch.message_id, 10);
          
          if (!isNaN(tmweEmailId)) {
            console.log(`[MIGRATE] ✅ Match: email_id=${tmweEmailId}`);
            
            if (!dry_run) {
              const { error: updateError } = await supabase
                .from('email_ai_classifications')
                .update({ tmwe_email_id: tmweEmailId })
                .eq('id', classification.id);

              if (updateError) {
                throw new Error(`Update failed: ${updateError.message}`);
              }
            }
            
            result.migrated++;
          } else {
            result.failed++;
            result.errors.push(`Invalid ID: ${classification.subject?.substring(0, 20)}`);
          }
        } else {
          result.failed++;
          console.log(`[MIGRATE] ❌ No match for: ${classification.subject?.substring(0, 40)}`);
        }

        // Rate limiting
        await new Promise(r => setTimeout(r, 100));
        
      } catch (err: any) {
        result.failed++;
        result.errors.push(`${classification.id.substring(0, 8)}: ${err.message.substring(0, 50)}`);
        console.error(`[MIGRATE] ❌ Error:`, err.message);
      }
    }

    console.log('[MIGRATE] 📊 Migration complete:', result);

    return new Response(JSON.stringify({
      success: true,
      dry_run,
      result
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('[MIGRATE] ❌ Fatal error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
