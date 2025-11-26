// ============================================
// EDGE FUNCTION: tmwe-jwt-sign
// ============================================
// ⚠️ NOMBRE LEGACY - Función reutilizada para evitar límite de slots
// 
// FUNCIONALIDAD ACTUAL: Migración de Email IDs
// - Pobla campo `tmwe_email_id` en tabla `email_ai_classifications`
// - Usa get_emails_metadata para obtener mapeo uid → id
// - Procesa por lotes agrupando por folder_name y user_email
//
// Historial:
// - 2025-11-26 v2: Nueva lógica usando get_emails_metadata
// - 2025-11-26 v1: Búsqueda por subject (no funcionó)
// - Pre-2025-11: JWT signing (consolidado en tmwe-api-proxy)
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// URL base de TMWE API
const TMWE_API_BASE_URL = 'https://findair.it/erp/tmwe_json';

interface MigrationResult {
  total: number;
  migrated: number;
  failed: number;
  skipped: number;
  no_oauth: number;
  not_found: number;
  folders_processed: number;
  errors: string[];
  details: Array<{
    folder: string;
    user: string;
    classifications: number;
    tmwe_emails: number;
    matched: number;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { batch_size = 100, dry_run = false, user_email_filter = null } = await req.json().catch(() => ({}));
    
    console.log('[MIGRATE-v2] 🚀 Starting TMWE Email ID Migration (get_emails_metadata strategy)');
    console.log('[MIGRATE-v2] 📊 Config:', { batch_size, dry_run, user_email_filter });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch classifications without tmwe_email_id
    let query = supabase
      .from('email_ai_classifications')
      .select('id, email_uid, sender_email, subject, folder_name, user_email, created_at')
      .is('tmwe_email_id', null)
      .order('created_at', { ascending: false })
      .limit(batch_size);
    
    if (user_email_filter) {
      query = query.eq('user_email', user_email_filter);
    }

    const { data: pendingClassifications, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch classifications: ${fetchError.message}`);
    }

    console.log(`[MIGRATE-v2] 📧 Found ${pendingClassifications?.length || 0} classifications to migrate`);

    const result: MigrationResult = {
      total: pendingClassifications?.length || 0,
      migrated: 0,
      failed: 0,
      skipped: 0,
      no_oauth: 0,
      not_found: 0,
      folders_processed: 0,
      errors: [],
      details: []
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

    // 2. Group classifications by user_email + folder_name
    const groupedByUserFolder = new Map<string, typeof pendingClassifications>();
    
    for (const classification of pendingClassifications) {
      const folder = classification.folder_name || 'INBOX';
      const user = classification.user_email;
      const key = `${user}|||${folder}`;
      
      if (!groupedByUserFolder.has(key)) {
        groupedByUserFolder.set(key, []);
      }
      groupedByUserFolder.get(key)!.push(classification);
    }

    console.log(`[MIGRATE-v2] 📂 Grouped into ${groupedByUserFolder.size} user+folder combinations`);

    // 3. Helper: Get OAuth token with auto-refresh via tmwe-api-proxy
    async function getOAuthTokenWithRefresh(userEmail: string): Promise<string | null> {
      // Query database for OAuth credentials
      const { data: credentials, error } = await supabase
        .from('user_tmwe_credentials')
        .select('access_token, refresh_token, expires_at')
        .eq('email', userEmail)
        .eq('token_type', 'oauth')
        .maybeSingle();
      
      if (error || !credentials?.access_token) {
        console.log(`[MIGRATE-v2] ⚠️ No OAuth token for user: ${userEmail}`);
        return null;
      }
      
      // Check if token is expired
      const isExpired = credentials.expires_at && new Date(credentials.expires_at) < new Date();
      
      if (isExpired && credentials.refresh_token) {
        console.log(`[MIGRATE-v2] 🔄 Token expired, refreshing for: ${userEmail}`);
        
        try {
          const tokenEndpoint = 'https://findair.it/erp/tmwe_json/token';
          const formData = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: credentials.refresh_token,
          });
          
          const tokenResponse = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString(),
          });
          
          if (!tokenResponse.ok) {
            console.log(`[MIGRATE-v2] ❌ Refresh failed for: ${userEmail}`);
            return null;
          }
          
          const tokenData = await tokenResponse.json();
          const { access_token, expires_in } = tokenData;
          
          if (!access_token) return null;
          
          // Update database with new token
          const expiresAt = expires_in ? new Date(Date.now() + (expires_in * 1000)).toISOString() : null;
          await supabase
            .from('user_tmwe_credentials')
            .update({
              access_token: access_token,
              expires_at: expiresAt,
              ...(tokenData.refresh_token ? { refresh_token: tokenData.refresh_token } : {})
            })
            .eq('email', userEmail)
            .eq('token_type', 'oauth');
          
          console.log(`[MIGRATE-v2] ✅ Token refreshed for: ${userEmail}`);
          return access_token;
        } catch (err) {
          console.log(`[MIGRATE-v2] ❌ Refresh error for ${userEmail}:`, err);
          return null;
        }
      }
      
      return credentials.access_token;
    }

    // 4. Helper: Fetch emails from TMWE API using get_emails_metadata
    async function fetchTmweEmails(folder: string, oauthToken: string, limit = 500): Promise<any[]> {
      const allEmails: any[] = [];
      let page = 1;
      const maxPages = 5; // Limitar a 2500 emails por folder
      
      while (page <= maxPages) {
        console.log(`[MIGRATE-v2] 📥 Fetching ${folder} page ${page}...`);
        
        const response = await fetch(`${TMWE_API_BASE_URL}/email_search`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${oauthToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            handler: 'get_emails_metadata',
            folder: folder,
            limit: limit,
            page: page
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.log(`[MIGRATE-v2] ⚠️ API Error (${response.status}): ${errorText.substring(0, 100)}`);
          break;
        }

        const data = await response.json();
        const emails = data?.messages || data?.emails || data?.data?.messages || [];
        
        console.log(`[MIGRATE-v2] 📬 Got ${emails.length} emails from page ${page}`);
        
        if (emails.length === 0) break;
        
        allEmails.push(...emails);
        
        // Check if there are more pages
        const pagination = data?.pagination;
        if (pagination && page >= pagination.pages) break;
        if (emails.length < limit) break;
        
        page++;
      }
      
      return allEmails;
    }

    // 5. Process each user+folder group
    for (const [key, classifications] of groupedByUserFolder.entries()) {
      const [userEmail, folder] = key.split('|||');
      
      console.log(`[MIGRATE-v2] 📂 Processing: ${userEmail} / ${folder} (${classifications.length} classifications)`);
      
      // Get OAuth token
      const oauthToken = await getOAuthTokenWithRefresh(userEmail);
      if (!oauthToken) {
        result.no_oauth += classifications.length;
        console.log(`[MIGRATE-v2] 🔒 No OAuth for: ${userEmail}, skipping ${classifications.length} classifications`);
        continue;
      }
      
      // Fetch TMWE emails for this folder
      let tmweEmails: any[];
      try {
        tmweEmails = await fetchTmweEmails(folder, oauthToken);
      } catch (err: any) {
        result.failed += classifications.length;
        result.errors.push(`Folder ${folder}: ${err.message}`);
        console.log(`[MIGRATE-v2] ❌ Failed to fetch emails for ${folder}:`, err.message);
        continue;
      }
      
      console.log(`[MIGRATE-v2] 📊 Got ${tmweEmails.length} emails from TMWE for folder: ${folder}`);
      
      // Create uid → tmwe_email_id map
      // TMWE API response includes: { id: 12345, uid: "99667", ... }
      const uidToTmweId = new Map<string, number>();
      
      for (const email of tmweEmails) {
        // id is the TMWE email ID (integer), uid is the IMAP UID
        const tmweId = email.id || email.email_id;
        const uid = email.uid;
        
        if (tmweId && uid) {
          uidToTmweId.set(String(uid), parseInt(String(tmweId), 10));
        }
      }
      
      console.log(`[MIGRATE-v2] 🗺️ Created uid→id map with ${uidToTmweId.size} entries`);
      
      // Sample: show first 5 mappings
      const sampleEntries = Array.from(uidToTmweId.entries()).slice(0, 5);
      console.log(`[MIGRATE-v2] 📋 Sample mappings:`, sampleEntries);
      
      // Match and update classifications
      let matched = 0;
      
      for (const classification of classifications) {
        const emailUid = classification.email_uid;
        
        if (!emailUid) {
          result.skipped++;
          continue;
        }
        
        // Handle folder prefix format: "Deleted Messages/1433" → "1433"
        let lookupUid = emailUid;
        if (emailUid.includes('/')) {
          const parts = emailUid.split('/');
          lookupUid = parts[parts.length - 1];
        }
        
        const tmweEmailId = uidToTmweId.get(lookupUid);
        
        if (tmweEmailId) {
          console.log(`[MIGRATE-v2] ✅ Match: uid=${lookupUid} → tmwe_email_id=${tmweEmailId}`);
          
          if (!dry_run) {
            const { error: updateError } = await supabase
              .from('email_ai_classifications')
              .update({ tmwe_email_id: tmweEmailId })
              .eq('id', classification.id);

            if (updateError) {
              result.failed++;
              result.errors.push(`Update ${classification.id}: ${updateError.message}`);
              continue;
            }
          }
          
          result.migrated++;
          matched++;
        } else {
          result.not_found++;
          console.log(`[MIGRATE-v2] ❓ No match for uid: ${lookupUid} (original: ${emailUid})`);
        }
      }
      
      result.folders_processed++;
      result.details.push({
        folder,
        user: userEmail,
        classifications: classifications.length,
        tmwe_emails: tmweEmails.length,
        matched
      });
      
      // Rate limiting between folders
      await new Promise(r => setTimeout(r, 200));
    }

    console.log('[MIGRATE-v2] 📊 Migration complete:', {
      total: result.total,
      migrated: result.migrated,
      not_found: result.not_found,
      failed: result.failed,
      no_oauth: result.no_oauth,
      folders_processed: result.folders_processed
    });

    return new Response(JSON.stringify({
      success: true,
      dry_run,
      result
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('[MIGRATE-v2] ❌ Fatal error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
