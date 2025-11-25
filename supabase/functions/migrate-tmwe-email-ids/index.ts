// ============================================
// MIGRATE TMWE EMAIL IDS - Phase 2 Migration Script
// Populates tmwe_email_id for existing email_ai_classifications
// Uses TMWE API search to find email_id from uid + folder
// ============================================

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MigrationResult {
  total: number;
  migrated: number;
  failed: number;
  errors: { id: string; error: string }[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('🚀 MIGRATE TMWE EMAIL IDS - Starting migration...');
  console.log('═══════════════════════════════════════════════════════');

  try {
    const { batch_size = 20, dry_run = false } = await req.json().catch(() => ({}));

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get classifications without tmwe_email_id
    const { data: classifications, error: fetchError } = await supabase
      .from('email_ai_classifications')
      .select('id, email_uid, folder_name, sender_email, subject, user_email, created_at')
      .is('tmwe_email_id', null)
      .order('created_at', { ascending: false })
      .limit(batch_size);

    if (fetchError) {
      throw new Error(`Failed to fetch classifications: ${fetchError.message}`);
    }

    if (!classifications || classifications.length === 0) {
      console.log('✅ No classifications need migration');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No classifications need migration',
          result: { total: 0, migrated: 0, failed: 0, errors: [] }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Found ${classifications.length} classifications to migrate`);

    const result: MigrationResult = {
      total: classifications.length,
      migrated: 0,
      failed: 0,
      errors: []
    };

    // Get TMWE OAuth token
    const { data: credentials, error: credError } = await supabase
      .from('user_tmwe_credentials')
      .select('access_token, token_expires_at')
      .limit(1)
      .maybeSingle();

    if (credError || !credentials?.access_token) {
      throw new Error('No valid TMWE credentials found');
    }

    // Check if token is expired
    const tokenExpires = new Date(credentials.token_expires_at);
    if (tokenExpires < new Date()) {
      throw new Error('TMWE token expired - please refresh via OAuth');
    }

    const tmweToken = credentials.access_token;
    const tmweApiBase = Deno.env.get('TMWE_API_BASE_URL') || 'https://api.tmwe.it';

    // Process each classification
    for (const classification of classifications) {
      try {
        console.log(`\n📧 Processing: ${classification.id.substring(0, 8)}...`);
        console.log(`   - UID: ${classification.email_uid}`);
        console.log(`   - Folder: ${classification.folder_name}`);
        console.log(`   - Sender: ${classification.sender_email}`);

        // Search TMWE API for this email using sender + folder
        // The API should return the email_id (integer) we need
        const searchParams = new URLSearchParams({
          handler: 'search_emails',
          query: classification.sender_email,
          search_folder: classification.folder_name || 'INBOX',
          limit: '50',
          timeout: '15'
        });

        const searchResponse = await fetch(`${tmweApiBase}/email_search`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tmweToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            handler: 'search_emails',
            query: classification.sender_email,
            search_folder: classification.folder_name || 'INBOX',
            limit: 50,
            timeout: 15
          })
        });

        if (!searchResponse.ok) {
          throw new Error(`TMWE API error: ${searchResponse.status}`);
        }

        const searchData = await searchResponse.json();
        const emails = searchData.emails || searchData.data?.emails || [];

        // Find matching email by UID
        const uidToFind = parseInt(classification.email_uid, 10);
        const matchingEmail = emails.find((e: any) => 
          e.uid === uidToFind || 
          e.email_uid === uidToFind ||
          String(e.uid) === classification.email_uid
        );

        if (!matchingEmail) {
          // Try alternative search by subject if available
          if (classification.subject) {
            console.log('   ⚠️ No match by sender, trying subject search...');
            
            const subjectSearchResponse = await fetch(`${tmweApiBase}/email_search`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${tmweToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                handler: 'search_emails',
                query: classification.subject.substring(0, 50),
                search_folder: classification.folder_name || 'INBOX',
                limit: 20,
                timeout: 15
              })
            });

            if (subjectSearchResponse.ok) {
              const subjectData = await subjectSearchResponse.json();
              const subjectEmails = subjectData.emails || subjectData.data?.emails || [];
              const subjectMatch = subjectEmails.find((e: any) => 
                e.uid === uidToFind || 
                String(e.uid) === classification.email_uid
              );

              if (subjectMatch) {
                const tmweEmailId = subjectMatch.id || subjectMatch.email_id;
                
                if (tmweEmailId && !dry_run) {
                  await supabase
                    .from('email_ai_classifications')
                    .update({ tmwe_email_id: tmweEmailId })
                    .eq('id', classification.id);
                }

                console.log(`   ✅ Found via subject: tmwe_email_id = ${tmweEmailId}`);
                result.migrated++;
                continue;
              }
            }
          }

          throw new Error(`No matching email found for UID ${classification.email_uid}`);
        }

        // Extract email_id from TMWE response
        const tmweEmailId = matchingEmail.id || matchingEmail.email_id;

        if (!tmweEmailId) {
          throw new Error('Email found but no email_id in response');
        }

        console.log(`   ✅ Found: tmwe_email_id = ${tmweEmailId}`);

        // Update classification with tmwe_email_id
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
        console.log(`   💾 Updated classification with tmwe_email_id = ${tmweEmailId}`);

        // Rate limiting - 500ms between requests
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (err: any) {
        console.error(`   ❌ Error: ${err.message}`);
        result.failed++;
        result.errors.push({
          id: classification.id,
          error: err.message
        });
      }
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 MIGRATION SUMMARY');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`   Total processed: ${result.total}`);
    console.log(`   ✅ Migrated: ${result.migrated}`);
    console.log(`   ❌ Failed: ${result.failed}`);
    if (dry_run) {
      console.log('   ⚠️ DRY RUN - no changes made');
    }
    console.log('═══════════════════════════════════════════════════════');

    return new Response(
      JSON.stringify({
        success: true,
        dry_run,
        result
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Migration error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
