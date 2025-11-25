// ============================================
// MIGRATE TMWE EMAIL IDS - Phase 2 Migration
// Populates tmwe_email_id in email_ai_classifications
// by searching TMWE API for matching emails
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MigrationResult {
  total: number;
  migrated: number;
  failed: number;
  errors: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { batch_size = 50, dry_run = false } = await req.json().catch(() => ({}));
    
    console.log('[MIGRATE] 🚀 Starting TMWE Email ID Migration...');
    console.log('[MIGRATE] 📊 Config:', { batch_size, dry_run });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const TMWE_API_URL = Deno.env.get('TMWE_API_URL');
    const TMWE_API_KEY = Deno.env.get('TMWE_API_KEY');
    
    if (!TMWE_API_URL || !TMWE_API_KEY) {
      throw new Error('TMWE_API_URL or TMWE_API_KEY not configured');
    }

    // 1. Get all classifications without tmwe_email_id
    const { data: pendingClassifications, error: fetchError } = await supabase
      .from('email_ai_classifications')
      .select('id, email_uid, sender_email, subject, folder_name, user_email, created_at')
      .is('tmwe_email_id', null)
      .order('created_at', { ascending: false })
      .limit(batch_size);

    if (fetchError) {
      throw new Error(`Failed to fetch classifications: ${fetchError.message}`);
    }

    console.log(`[MIGRATE] 📧 Found ${pendingClassifications?.length || 0} classifications to migrate`);

    const result: MigrationResult = {
      total: pendingClassifications?.length || 0,
      migrated: 0,
      failed: 0,
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

    // 2. Process each classification
    for (const classification of pendingClassifications) {
      try {
        console.log(`[MIGRATE] 🔍 Searching for email: ${classification.subject?.substring(0, 50)}...`);
        
        // Search TMWE API for matching email by subject and sender
        const searchResponse = await fetch(`${TMWE_API_URL}/api/email_search`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${TMWE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            handler: 'search_emails',
            query: classification.subject || '',
            limit: 10,
            timeout: 15
          })
        });

        if (!searchResponse.ok) {
          const errorText = await searchResponse.text();
          throw new Error(`TMWE API search failed: ${errorText}`);
        }

        const searchData = await searchResponse.json();
        const emails = searchData?.emails || [];

        // Find best match by sender_email + subject similarity
        let bestMatch = null;
        for (const email of emails) {
          const emailSender = email.from?.email || email.from_email || '';
          
          // Match by sender email (exact match)
          if (emailSender.toLowerCase() === classification.sender_email?.toLowerCase()) {
            bestMatch = email;
            break;
          }
        }

        if (bestMatch && bestMatch.email_id) {
          const tmweEmailId = parseInt(bestMatch.email_id, 10);
          
          if (!isNaN(tmweEmailId)) {
            console.log(`[MIGRATE] ✅ Match found: email_id=${tmweEmailId}`);
            
            if (!dry_run) {
              // Update the classification with tmwe_email_id
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
            result.errors.push(`Invalid email_id for: ${classification.subject?.substring(0, 30)}`);
          }
        } else {
          result.failed++;
          console.log(`[MIGRATE] ⚠️ No match found for: ${classification.subject?.substring(0, 50)}`);
        }

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 100));
        
      } catch (err: any) {
        result.failed++;
        result.errors.push(`${classification.id}: ${err.message}`);
        console.error(`[MIGRATE] ❌ Error processing ${classification.id}:`, err.message);
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
    console.error('[MIGRATE] ❌ Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
