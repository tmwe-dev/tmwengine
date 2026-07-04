// ═══════════════════════════════════════════════════════════════════════════
// TMWE API PROXY v5.2 - FORCED REDEPLOY + AUTO-REFRESH
// Deploy timestamp: 2025-11-24T11:20:00Z
// Fix: Token OAuth auto-refresh inline + validación forzada
// ═══════════════════════════════════════════════════════════════════════════
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// 🔥 v5.2 FORCED REDEPLOY - CONFIRM DEPLOYMENT
const V5_DEPLOY_TIMESTAMP = '2025-11-24T11:20:00Z';
const V5_VERSION = 'v5.2-FORCED-REDEPLOY-AUTO-REFRESH';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Circuit Breaker per IMAP server health
interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

const circuitBreaker: Map<string, CircuitBreakerState> = new Map();
const FAILURE_THRESHOLD = 5;
const COOLDOWN_MS = 60000; // 1 minuto

function checkCircuitBreaker(handler: string): boolean {
  const state = circuitBreaker.get(handler) || { failures: 0, lastFailure: 0, isOpen: false };
  
  // Reset dopo cooldown
  if (state.isOpen && Date.now() - state.lastFailure > COOLDOWN_MS) {
    state.isOpen = false;
    state.failures = 0;
  }
  
  return !state.isOpen;
}

function recordFailure(handler: string, errorMessage: string) {
  const state = circuitBreaker.get(handler) || { failures: 0, lastFailure: 0, isOpen: false };
  
  // Solo conteggia errori IMAP
  if (errorMessage.includes('Connection refused') || errorMessage.includes('IMAP')) {
    state.failures++;
    state.lastFailure = Date.now();
    
    if (state.failures >= FAILURE_THRESHOLD) {
      state.isOpen = true;
      console.error(`🔴 Circuit Breaker OPEN per ${handler} (${state.failures} failures)`);
    }
  }
  
  circuitBreaker.set(handler, state);
}

function recordSuccess(handler: string) {
  const state = circuitBreaker.get(handler);
  if (state && state.failures > 0) {
    state.failures = Math.max(0, state.failures - 1); // Decrementa gradualmente
    circuitBreaker.set(handler, state);
  }
}

serve(async (req) => {
  // 🚨 IMMEDIATE LOG - Confirm v5.2 deployment
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  🚀 TMWE API PROXY v5.2 - ACTIVE                             ║');
  console.log('║  📅 Deploy:', V5_DEPLOY_TIMESTAMP, '                         ║');
  console.log('║  🔄 Auto-refresh: ENABLED                                    ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONSOLIDATED INTERNAL HANDLERS (from tmwe-jwt-sign, tmwe-jwt-refresh, etc.)
  // ═══════════════════════════════════════════════════════════════════════════
  
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  
  // Pre-parse body for internal handlers
  let bodyText = '';
  let parsedBody: any = null;
  try {
    bodyText = await req.text();
    if (bodyText && bodyText.trim().length > 0) {
      parsedBody = JSON.parse(bodyText);
    }
  } catch (e) {
    // Will be handled later for non-internal requests
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLER: internal_jwt_sign (consolidado de tmwe-jwt-sign)
  // ═══════════════════════════════════════════════════════════════════════════
  if (parsedBody?.handler === 'internal_jwt_sign') {
    try {
      console.log('🔐 [INTERNAL] JWT Sign handler...');
      const { clientId, clientSecret } = parsedBody;
      
      if (!clientId || !clientSecret) {
        throw new Error('Missing clientId or clientSecret');
      }
      
      // Verify user
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
        if (userError || !user) {
          throw new Error(`User authentication failed: ${userError?.message}`);
        }
        console.log('✅ User authenticated:', user.email);
      }
      
      // Generate JWT Header
      const header = { alg: 'HS256', typ: 'JWT' };
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        iss: 'https://findair.it/erp/tmwe_json',
        sub: clientId,
        aud: 'https://findair.it/erp/tmwe_json/token',
        exp: now + 300,
        iat: now,
        jti: crypto.randomUUID()
      };
      
      const encoder = new TextEncoder();
      const headerBase64 = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      const payloadBase64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      const message = `${headerBase64}.${payloadBase64}`;
      
      const key = await crypto.subtle.importKey('raw', encoder.encode(clientSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
      const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      
      const jwt = `${message}.${signatureBase64}`;
      console.log('✅ JWT signed successfully');
      
      return new Response(JSON.stringify({ jwt, expiresIn: 300 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
      });
    } catch (error: any) {
      console.error('❌ JWT signing error:', error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500
      });
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLER: internal_jwt_refresh (consolidado de tmwe-jwt-refresh)
  // ═══════════════════════════════════════════════════════════════════════════
  if (parsedBody?.handler === 'internal_jwt_refresh') {
    try {
      console.log('🔐 [INTERNAL] JWT Refresh handler...');
      const { email } = parsedBody;
      if (!email) throw new Error('Email is required');
      
      const { data: credentials, error: fetchError } = await supabaseAdmin
        .from('user_tmwe_credentials')
        .select('*')
        .eq('email', email)
        .single();
      
      if (fetchError || !credentials) {
        throw new Error(`Failed to fetch credentials: ${fetchError?.message || 'No credentials found'}`);
      }
      
      if (!credentials.refresh_token || !credentials.client_id || !credentials.client_secret) {
        throw new Error('Missing required credentials');
      }
      
      const tokenResponse = await fetch('https://findair.it/erp/tmwe_json/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token_jwt',
          refresh_token: credentials.refresh_token,
          client_id: credentials.client_id,
          client_secret: credentials.client_secret,
        }),
      });
      
      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(`Token refresh failed: ${tokenResponse.status} ${errorText}`);
      }
      
      const tokenData = await tokenResponse.json();
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
      
      await supabaseAdmin
        .from('user_tmwe_credentials')
        .update({
          access_token: tokenData.access_token,
          expires_at: expiresAt,
          ...(tokenData.refresh_token && { refresh_token: tokenData.refresh_token })
        })
        .eq('email', email);
      
      console.log('✅ JWT credentials refreshed');
      return new Response(JSON.stringify({
        access_token: tokenData.access_token,
        expires_in: tokenData.expires_in,
        token_type: 'Bearer'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    } catch (error: any) {
      console.error('❌ JWT refresh error:', error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500
      });
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLER: internal_supabase_sync (consolidado de tmwe-supabase-sync)
  // ═══════════════════════════════════════════════════════════════════════════
  if (parsedBody?.handler === 'internal_supabase_sync') {
    try {
      console.log('🔄 [INTERNAL] Supabase Sync handler...');
      const { tmweEmail, tmweProfile } = parsedBody;
      
      if (!tmweEmail) {
        return new Response(JSON.stringify({ error: 'Email TMWE mancante' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Search existing user
      const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) throw listError;
      
      let supabaseUser = existingUsers.users.find(u => u.email === tmweEmail);
      
      // Create user if not exists
      if (!supabaseUser) {
        console.log(`➕ Creating new Supabase user: ${tmweEmail}`);
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: tmweEmail,
          email_confirm: true,
          user_metadata: { tmwe_oauth: true, name: tmweProfile?.name || tmweEmail.split('@')[0] }
        });
        if (createError) throw createError;
        supabaseUser = newUser.user;
      }
      
      // Upsert profile
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .upsert({
          user_id: supabaseUser.id,
          tmwe_email: tmweEmail,
          display_name: tmweProfile?.name || supabaseUser.email?.split('@')[0],
        }, { onConflict: 'user_id' })
        .select()
        .single();
      
      if (profileError) throw profileError;
      
      console.log('✅ Sync completed for:', supabaseUser.id);
      return new Response(JSON.stringify({
        success: true,
        supabaseUserId: supabaseUser.id,
        profile,
        message: 'Sincronizzazione completata'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    } catch (error: any) {
      console.error('❌ Sync error:', error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500
      });
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLER: internal_test_folder_info (consolidado de tmwe-test-folder-info)
  // ═══════════════════════════════════════════════════════════════════════════
  if (parsedBody?.handler === 'internal_test_folder_info') {
    try {
      console.log('📁 [INTERNAL] Test Folder Info handler...');
      
      let oauthToken = Deno.env.get('TMWE_OAUTH_TOKEN');
      
      if (!oauthToken) {
        const { data: provider } = await supabaseAdmin
          .from('email_provider')
          .select('email_provider_credenziali(*)')
          .eq('provider', 'TMWE')
          .eq('attivo', true)
          .maybeSingle();
        
        const creds = provider?.email_provider_credenziali;
        if (creds && (creds.oauth_token || creds.api_key)) {
          oauthToken = creds.oauth_token || creds.api_key;
        }
      }
      
      if (!oauthToken) throw new Error('Token non trovato');
      
      const baseUrl = 'https://findair.it/erp/tmwe_json';
      const folderUrl = `${baseUrl}/app.php?action=email_folder`;
      
      // Get folder info
      const folderResponse = await fetch(folderUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${oauthToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ handler: 'get_folder_info', folder_name: 'INBOX', include_counts: true })
      });
      const folderData = await folderResponse.json();
      
      // Get folders list
      const foldersResponse = await fetch(folderUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${oauthToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ handler: 'get_folders', include_counts: true, hierarchy: true })
      });
      const foldersData = await foldersResponse.json();
      
      return new Response(JSON.stringify({
        success: true, folder_info: folderData, folders_list: foldersData
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    } catch (error: any) {
      console.error('❌ Folder info error:', error.message);
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500
      });
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLER: email_send (consolidado de tmwe-email-send)
  // ═══════════════════════════════════════════════════════════════════════════
  if (parsedBody?.handler === 'email_send') {
    try {
      console.log('📧 [HANDLER] Email Send...');
      const { to, subject, body_text, body_html } = parsedBody;
      
      // Get user email from Authorization header
      const authHeader = req.headers.get('Authorization');
      let oauthToken: string;
      
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
        if (userError || !user?.email) throw new Error('User authentication failed');
        
        // Get OAuth token from user_tmwe_credentials
        const { data: creds, error: credsError } = await supabaseAdmin
          .from('user_tmwe_credentials')
          .select('access_token')
          .eq('email', user.email)
          .eq('token_type', 'oauth')
          .maybeSingle();
        
        if (credsError || !creds?.access_token) {
          throw new Error('No OAuth token found for user');
        }
        oauthToken = creds.access_token;
      } else {
        throw new Error('Authorization header required');
      }
      
      const payload = {
        handler: 'send_message',
        to, subject,
        body: body_text || body || 'Test message body',
        body_html: body_html || ''
      };
      
      const apiUrl = 'https://findair.it/erp/tmwe_json/app.php?action=email_message';
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${oauthToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const responseText = await response.text();
      let responseJson = null;
      try {
        if (responseText.trim()) responseJson = JSON.parse(responseText);
      } catch (e) {}
      
      const isSuccess = response.ok && (responseJson?.success !== false);
      
      return new Response(JSON.stringify({
        success: isSuccess,
        message_id: responseJson?.message_id,
        tmwe_response: responseJson
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    } catch (error: any) {
      console.error('❌ Email send error:', error.message);
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500
      });
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLER: email_sync (consolidado de tmwe-email-sync-master)
  // ═══════════════════════════════════════════════════════════════════════════
  if (parsedBody?.handler === 'email_sync') {
    try {
      console.log('🔄 [HANDLER] Email Sync...');
      const { mode = 'auto', folder_name = 'INBOX', max_emails = 0, force_full = false, unread_only = false } = parsedBody;
      
      // Get user email
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) throw new Error('Authorization required');
      
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
      if (userError || !user?.email) throw new Error('User authentication failed');
      
      const userEmail = user.email;
      console.log('👤 User:', userEmail);
      
      // Get OAuth token
      const { data: creds } = await supabaseAdmin
        .from('user_tmwe_credentials')
        .select('access_token')
        .eq('email', userEmail)
        .eq('token_type', 'oauth')
        .maybeSingle();
      
      if (!creds?.access_token) throw new Error('No OAuth token found');
      const oauthToken = creds.access_token;
      
      // Get provider ID
      const { data: providerData } = await supabaseAdmin
        .from('email_provider')
        .select('id')
        .eq('provider', 'TMWE')
        .eq('attivo', true)
        .maybeSingle();
      
      if (!providerData) throw new Error('Provider TMWE not found');
      
      // Determine actual mode
      let actualMode = mode;
      if (mode === 'auto') {
        const { count: existingEmails } = await supabaseAdmin
          .from('email_messages')
          .select('*', { count: 'exact', head: true })
          .eq('cartella', folder_name);
        
        actualMode = (existingEmails === 0 || force_full) ? 'initial' : 'incremental';
      }
      
      const batchSize = 10;
      let targetEmails = max_emails;
      let syncType = 'manuale';
      
      if (actualMode === 'initial') {
        targetEmails = targetEmails || 5000;
        syncType = 'full_sync';
      } else if (actualMode === 'incremental') {
        targetEmails = targetEmails || 200;
        syncType = 'incremental_sync';
      }
      
      // Create sync log
      const { data: syncLog, error: syncLogError } = await supabaseAdmin
        .from('email_sync_logs')
        .insert({ provider_id: providerData.id, tipo_sync: syncType, stato: 'in_corso' })
        .select()
        .single();
      
      if (syncLogError) throw syncLogError;
      
      // Fetch and sync emails (simplified version)
      let totalImported = 0;
      const baseUrl = 'https://findair.it/erp/tmwe_json';
      const allUIDs: Array<{uid: string, subject: string, from: string, date: string}> = [];
      
      // Step 1: Get UIDs list
      const listUrl = `${baseUrl}/app.php?action=email_message`;
      const listResponse = await fetch(listUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${oauthToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ handler: 'get_messages', folder: folder_name, limit: Math.min(targetEmails, 50), offset: 0 })
      });
      
      if (listResponse.ok) {
        const listData = await listResponse.json();
        const emails = listData.messages || [];
        for (const email of emails) {
          if (email.uid) {
            allUIDs.push({
              uid: email.uid,
              subject: email.subject || 'No subject',
              from: email.from || '',
              date: email.date || ''
            });
          }
        }
      }
      
      console.log(`📊 Found ${allUIDs.length} UIDs`);
      
      // Step 2: Download missing emails
      for (const emailInfo of allUIDs.slice(0, targetEmails)) {
        const { count: existingCount } = await supabaseAdmin
          .from('email_messages')
          .select('*', { count: 'exact', head: true })
          .eq('message_id', emailInfo.uid);
        
        if (existingCount && existingCount > 0) continue;
        
        // Download email
        const messageResponse = await fetch(`${baseUrl}/app.php?action=email_message`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${oauthToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ handler: 'get_message', uid: emailInfo.uid, include_attachments: true, format: 'text' })
        });
        
        if (messageResponse.ok) {
          const messageData = await messageResponse.json();
          if (messageData.success) {
            const msgData = messageData.result || messageData;
            const header = msgData.data?.header || msgData;
            
            await supabaseAdmin.from('email_messages').insert({
              message_id: emailInfo.uid,
              user_email: userEmail,
              subject: header.subject || emailInfo.subject,
              from_email: header.from || emailInfo.from,
              to_email: Array.isArray(header.to) ? header.to.join(', ') : '',
              data_ricezione: new Date(header.date || emailInfo.date || Date.now()).toISOString(),
              cartella: folder_name,
              provider_id: providerData.id,
              flags: { seen: header.seen, flagged: header.flagged },
              direzione: 'inbound',
              stato: header.seen ? 'letto' : 'nuovo',
              body_text: msgData.data?.body_plain || '',
              body_html: msgData.data?.body_html || null,
              attachments: msgData.data?.attachments || [],
              data_invio: new Date(header.date || emailInfo.date || Date.now()).toISOString()
            });
            
            totalImported++;
          }
        }
        
        if (totalImported >= targetEmails) break;
        await new Promise(r => setTimeout(r, 200));
      }
      
      // Finalize sync
      await supabaseAdmin
        .from('email_sync_logs')
        .update({ stato: 'completato', sync_end: new Date().toISOString(), messaggi_nuovi: totalImported })
        .eq('id', syncLog.id);
      
      const { count: totalInDb } = await supabaseAdmin
        .from('email_messages')
        .select('*', { count: 'exact', head: true })
        .eq('cartella', folder_name);
      
      return new Response(JSON.stringify({
        success: true,
        mode_used: actualMode,
        emails_downloaded: totalImported,
        total_emails_in_db: totalInDb,
        sync_log_id: syncLog.id,
        message: `Sync completed: ${totalImported} emails imported`
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    } catch (error: any) {
      console.error('❌ Email sync error:', error.message);
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500
      });
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLER: oauth_auth (consolidado de tmwe-oauth-auth)
  // ═══════════════════════════════════════════════════════════════════════════
  if (parsedBody?.handler === 'oauth_auth') {
    try {
      console.log('🔐 [HANDLER] OAuth Auth...');
      const { code, redirectUri } = parsedBody;
      
      if (!code || !redirectUri) throw new Error('Missing code or redirectUri');
      
      const clientId = Deno.env.get('TMWE_CLIENT_ID');
      const clientSecret = Deno.env.get('TMWE_CLIENT_SECRET');
      
      if (!clientSecret) throw new Error('TMWE_CLIENT_SECRET not configured');
      
      // Exchange code for tokens
      const tokenEndpoint = 'https://findair.it/erp/tmwe_json/token';
      const formData = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      });
      
      const tokenResponse = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      });
      
      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(`Token exchange failed: ${tokenResponse.status} ${errorText}`);
      }
      
      const tokenData = await tokenResponse.json();
      if (!tokenData.access_token || !tokenData.expires_in) {
        throw new Error('Invalid token response');
      }
      
      const { access_token, expires_in, email } = tokenData;
      
      // Get user profile
      const myProfileResponse = await fetch('https://findair.it/erp/tmwe_json/get_my_profile', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
      });
      
      if (!myProfileResponse.ok) throw new Error('Failed to fetch profile');
      const profileData = await myProfileResponse.json();
      
      // Find or create Supabase user
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      let supabaseUser = existingUsers.users.find(u => u.email === email);
      
      if (!supabaseUser) {
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: email,
          email_confirm: true,
          user_metadata: { tmwe_oauth: true, name: profileData.name || profileData.username }
        });
        if (createError) throw createError;
        supabaseUser = newUser.user;
      }
      
      // Update profile
      await supabaseAdmin.from('user_profiles').upsert({
        user_id: supabaseUser.id,
        tmwe_email: email,
        display_name: profileData.name || profileData.username,
      }, { onConflict: 'user_id' });
      
      // Save credentials
      const expiresAt = new Date(Date.now() + (expires_in * 1000)).toISOString();
      await supabaseAdmin.from('user_tmwe_credentials').upsert({
        email: email,
        access_token: access_token,
        refresh_token: tokenData.refresh_token || null,
        expires_at: expiresAt,
        client_id: clientId,
        client_secret: clientSecret,
        token_type: 'oauth',
      }, { onConflict: 'email' });
      
      // Generate magic link
      const supabaseExpiresInSeconds = Math.floor(expires_in * 0.8);
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
        options: { expiresIn: supabaseExpiresInSeconds }
      });
      
      if (linkError || !linkData) throw new Error('Failed to generate magic link');
      
      return new Response(JSON.stringify({
        success: true,
        email: email,
        profile: {
          name: profileData.name,
          username: profileData.username,
          enterprise_name: profileData.enterprise_name,
          rubrica: profileData.rubrica,
        },
        supabaseUserId: supabaseUser.id,
        magicLink: linkData.properties.action_link,
        tmwe_access_token: access_token,
        token_format: 'oauth',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    } catch (error: any) {
      console.error('❌ OAuth auth error:', error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500
      });
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLER: oauth_refresh (consolidado de tmwe-oauth-refresh)
  // ═══════════════════════════════════════════════════════════════════════════
  if (parsedBody?.handler === 'oauth_refresh') {
    try {
      console.log('🔄 [HANDLER] OAuth Refresh...');
      const { email } = parsedBody;
      
      if (!email) throw new Error('Missing email');
      
      // Get credentials
      const { data: credentials, error: credsError } = await supabaseAdmin
        .from('user_tmwe_credentials')
        .select('*')
        .eq('email', email)
        .eq('token_type', 'oauth')
        .single();
      
      if (credsError || !credentials) throw new Error('OAuth credentials not found');
      if (!credentials.refresh_token) throw new Error('No refresh token available');
      
      // Refresh token
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
        const errorData = await tokenResponse.json().catch(() => ({}));
        throw new Error(`OAuth refresh failed: ${errorData.error || 'Unknown error'}`);
      }
      
      const tokenData = await tokenResponse.json();
      if (!tokenData.access_token) throw new Error('Invalid token response');
      
      const { access_token, expires_in } = tokenData;
      const expiresAt = new Date(Date.now() + (expires_in * 1000)).toISOString();
      
      // Update credentials
      const updateData: any = { access_token, expires_at: expiresAt };
      if (tokenData.refresh_token) updateData.refresh_token = tokenData.refresh_token;
      
      await supabaseAdmin
        .from('user_tmwe_credentials')
        .update(updateData)
        .eq('email', email)
        .eq('token_type', 'oauth');
      
      return new Response(JSON.stringify({
        success: true,
        access_token: access_token,
        expires_in: expires_in,
        token_format: 'oauth',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    } catch (error: any) {
      console.error('❌ OAuth refresh error:', error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500
      });
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLER: migrate_email_ids (consolidado de tmwe-jwt-sign)
  // ═══════════════════════════════════════════════════════════════════════════
  if (parsedBody?.handler === 'migrate_email_ids') {
    try {
      console.log('🔄 [HANDLER] Migrate Email IDs...');
      const { batch_size = 100, dry_run = false, user_email } = parsedBody;
      
      if (!user_email) throw new Error('user_email is required');
      
      // Fetch classifications without tmwe_email_id
      const { data: pendingClassifications, error: fetchError } = await supabaseAdmin
        .from('email_ai_classifications')
        .select('id, email_uid, sender_email, subject, folder_name, user_email, created_at')
        .is('tmwe_email_id', null)
        .eq('user_email', user_email)
        .order('created_at', { ascending: false })
        .limit(batch_size);
      
      if (fetchError) throw fetchError;
      
      const result: any = {
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
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
      }
      
      // Group by user+folder
      const groupedByUserFolder = new Map();
      for (const classification of pendingClassifications) {
        const folder = classification.folder_name || 'INBOX';
        const key = `${classification.user_email}|||${folder}`;
        if (!groupedByUserFolder.has(key)) groupedByUserFolder.set(key, []);
        groupedByUserFolder.get(key).push(classification);
      }
      
      // Process each group (simplified)
      for (const [key, classifications] of groupedByUserFolder.entries()) {
        const [userEmail, folder] = key.split('|||');
        
        // Get OAuth token
        const { data: creds } = await supabaseAdmin
          .from('user_tmwe_credentials')
          .select('access_token')
          .eq('email', userEmail)
          .eq('token_type', 'oauth')
          .maybeSingle();
        
        if (!creds?.access_token) {
          result.no_oauth += classifications.length;
          continue;
        }
        
        // Fetch TMWE emails metadata
        const response = await fetch('https://findair.it/erp/tmwe_json/email_search', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${creds.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ handler: 'get_emails_metadata', folder: folder, limit: 500, page: 1 })
        });
        
        if (!response.ok) {
          result.failed += classifications.length;
          continue;
        }
        
        const data = await response.json();
        const emails = data?.messages || data?.emails || [];
        
        // Create UID → ID map
        const uidToTmweId = new Map();
        for (const email of emails) {
          const tmweId = email.id || email.email_id;
          let uid = email.uid ? String(email.uid) : null;
          if (!uid && email.elasticsearch_id) {
            const match = email.elasticsearch_id.match(/^uid_(\d+)_/);
            if (match) uid = match[1];
          }
          if (tmweId && uid) uidToTmweId.set(uid, parseInt(String(tmweId), 10));
        }
        
        // Match and update
        let matched = 0;
        for (const classification of classifications) {
          let lookupUid = classification.email_uid;
          if (lookupUid?.includes('/')) {
            lookupUid = lookupUid.split('/').pop();
          }
          
          const tmweEmailId = uidToTmweId.get(lookupUid);
          if (tmweEmailId) {
            if (!dry_run) {
              await supabaseAdmin
                .from('email_ai_classifications')
                .update({ tmwe_email_id: tmweEmailId })
                .eq('id', classification.id);
            }
            result.migrated++;
            matched++;
          } else {
            result.not_found++;
          }
        }
        
        result.folders_processed++;
        result.details.push({
          folder, user: userEmail,
          classifications: classifications.length,
          tmwe_emails: emails.length,
          matched
        });
      }
      
      return new Response(JSON.stringify({
        success: true,
        dry_run,
        result
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    } catch (error: any) {
      console.error('❌ Migrate email IDs error:', error.message);
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500
      });
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN PROXY LOGIC (original code continues)
  // ═══════════════════════════════════════════════════════════════════════════

  try {
    // Parse request body con gestione errori robusta
    // Use pre-parsed body from lines 90-99 to avoid "Body already consumed" error
    if (!parsedBody) {
      console.error('═══════════════════════════════════════════════════════');
      console.error('🔥 ERRORE nel parsing del body della richiesta');
      console.error('═══════════════════════════════════════════════════════');
      console.error('⚠️ Error: Body is null or invalid');
      console.error('═══════════════════════════════════════════════════════');
      
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request body',
          details: 'Body is null or could not be parsed',
          hint: 'Request body must be valid JSON with endpoint and data fields'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const requestBody = parsedBody;
    
    const { endpoint, data, optimizationFlags, requestTimeout } = requestBody;
    
    // ⏱️ Timeout dinamico basato su handler (OTTIMIZZATO PER SINGLE FAST MAX)
    const getTimeoutForHandler = (handler: string): number => {
      switch (handler) {
        case 'get_message': return 90000; // ✅ 90s per download singola email (email pesanti con allegati)
        case 'get_messages': return 90000; // 90s per operazioni lente
        case 'get_folders': return 60000; // 60s per cartelle
        case 'full_sync': return 120000; // 2 min per sync completo
        default: return 45000; // ✅ 45s default (aumentato da 30s)
      }
    };
    
    const timeout = requestTimeout || getTimeoutForHandler(data?.handler) || 30000;
    
    // 🚀 CONFIGURAZIONE OTTIMALE DI PRODUZIONE (basata su benchmark)
    const enableLogging = optimizationFlags?.enableLogging ?? false;
    const useDoubleSerializat = optimizationFlags?.useDoubleSerializat ?? false;
    const useTextResponse = optimizationFlags?.useTextResponse ?? false;
    const useSequentialExecution = optimizationFlags?.useSequentialExecution ?? false;
    const useBatchParallelization = optimizationFlags?.useBatchParallelization ?? true;
    const batchChunkSize = optimizationFlags?.batchChunkSize ?? 5; // ✅ Ridotto da 10 a 5 per evitare timeout
    
    if (enableLogging) {
      console.log('═══════════════════════════════════════════════════════');
      console.log('🔄 TMWE API PROXY - Richiesta ricevuta');
      console.log('═══════════════════════════════════════════════════════');
      console.log('⏰ Timestamp:', new Date().toISOString());
      console.log('📍 Endpoint:', endpoint);
      console.log('🎯 Handler:', data?.handler);
      console.log('⏱️ Timeout configurato:', timeout, 'ms');
      console.log('═══════════════════════════════════════════════════════');
    }

    // Helper function per chunking array
    function chunkArray<T>(array: T[], size: number): T[][] {
      const chunks: T[][] = [];
      for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
      }
      return chunks;
    }

    // Get auth header from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Extract JWT token from Authorization header
    const token = authHeader.replace('Bearer ', '');
    
    // 🔑 DUAL AUTHENTICATION MODE
    // Rileva se è una chiamata da Service Role tramite header custom
    const isServiceRole = req.headers.get('X-Service-Role-Call') === 'true';
    
    let userEmail: string;
    
    if (isServiceRole) {
      // Modalità Service Role: richiedi bearerToken + user_email nel body
      if (enableLogging) {
        console.log('🔑 Service Role authentication detected');
      }
      
      if (!data.bearerToken) {
        throw new Error('Service role calls require bearerToken (TMWE token) in request body');
      }
      
      if (!data.user_email) {
        throw new Error('Service role calls require user_email in request body');
      }
      
      userEmail = data.user_email;
      
      if (enableLogging) {
        console.log('✅ Service role authenticated for user:', userEmail);
      }
    } else {
      // Modalità User JWT: verifica come prima
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
      
      if (authError || !user) {
        console.error('❌ Auth error:', authError);
        throw new Error('Unauthorized');
      }
      
      userEmail = user.email!;
      
      if (enableLogging) {
        console.log('✅ User authenticated:', userEmail);
      }
    }

    // 🔑 INLINE OAUTH TOKEN MANAGEMENT (v5.2 - ALWAYS VALIDATE & AUTO-REFRESH)
    let tmweAccessToken: string | null = null;
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('[OAuth-v5.2] 🔐 Starting OAuth token validation');
    console.log('[OAuth-v5.2] 👤 User:', userEmail);
    console.log('[OAuth-v5.2] 📅 Current time:', new Date().toISOString());
    console.log('═══════════════════════════════════════════════════════');
    
    // 1. Check environment variable first (highest priority)
    const envToken = Deno.env.get('TMWE_OAUTH_TOKEN');
    if (envToken && envToken.trim() !== '') {
      console.log('[OAuth] ✅ Using token from environment variable');
      tmweAccessToken = envToken;
    } else {
      // 2. Query database for user credentials (ALWAYS, even if bearerToken provided)
      const { data: credentials, error: credErr } = await supabaseClient
        .from('user_tmwe_credentials')
        .select('access_token, refresh_token, expires_at, token_type')
        .eq('email', userEmail)
        .eq('token_type', 'oauth')
        .maybeSingle();
      
      if (credErr) {
        console.error('[OAuth] ❌ Error querying database:', credErr);
        throw new Error(`Error fetching OAuth credentials: ${credErr.message}`);
      }
      
      if (!credentials || !credentials.access_token) {
        console.error('[OAuth] ❌ OAuth token not found in DB');
        throw new Error(`OAuth token not found for ${userEmail}. Please login to TMWE first.`);
      }
      
      // 3. Check if token is expired or will expire soon
      let needsRefresh = false;
      if (credentials.expires_at) {
        const expiresAt = new Date(credentials.expires_at);
        const now = new Date();
        const bufferMinutes = 5; // Refresh 5 minutes before expiration
        const bufferMs = bufferMinutes * 60 * 1000;
        const willExpireSoon = expiresAt.getTime() - now.getTime() < bufferMs;
        
        console.log(`[OAuth] 📅 Token expires: ${expiresAt.toISOString()}`);
        
        if (expiresAt < now || willExpireSoon) {
          console.log(`[OAuth] ⚠️ Token ${expiresAt < now ? 'expired' : 'will expire soon'}`);
          needsRefresh = true;
        } else {
          console.log(`[OAuth] ✅ Token valid until: ${expiresAt.toISOString()}`);
        }
      }
      
      // 4. INLINE REFRESH if needed
      if (needsRefresh && credentials.refresh_token) {
        console.log('[OAuth] 🔄 Starting inline token refresh...');
        
        try {
          const tokenEndpoint = 'https://findair.it/erp/tmwe_json/token';
          const formData = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: credentials.refresh_token,
          });
          
          console.log('[OAuth] 🌐 Calling TMWE token endpoint...');
          const tokenResponse = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
          });
          
          console.log('[OAuth] 📥 Response status:', tokenResponse.status);
          
          if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json().catch(() => ({}));
            console.error('[OAuth] ❌ Refresh failed:', errorData);
            throw new Error(`OAuth refresh failed: ${errorData.error?.message || 'Unknown error'}`);
          }
          
          const tokenData = await tokenResponse.json();
          const { access_token, expires_in } = tokenData;
          
          if (!access_token) {
            throw new Error('Invalid OAuth token response');
          }
          
          console.log('[OAuth] ✅ New token obtained, expires_in:', expires_in);
          
          // Update database with new token
          const expiresAt = expires_in ? new Date(Date.now() + (expires_in * 1000)).toISOString() : null;
          const updateData: any = {
            access_token: access_token,
            expires_at: expiresAt,
          };
          
          if (tokenData.refresh_token) {
            updateData.refresh_token = tokenData.refresh_token;
          }
          
          const { error: updateError } = await supabaseClient
            .from('user_tmwe_credentials')
            .update(updateData)
            .eq('email', userEmail)
            .eq('token_type', 'oauth');
          
          if (updateError) {
            console.error('[OAuth] ❌ Error updating credentials:', updateError);
            throw updateError;
          }
          
          console.log('[OAuth] ✅ Token refreshed and saved successfully');
          tmweAccessToken = access_token;
          
        } catch (refreshError: any) {
          console.error('[OAuth] ❌ Critical error during refresh:', refreshError);
          throw new Error(
            `Token expired and refresh failed: ${refreshError.message}. Please login to TMWE again.`
          );
        }
      } else {
        // Token is valid, use it
        tmweAccessToken = credentials.access_token;
      }
    }
    
    if (!tmweAccessToken) {
      throw new Error('No valid TMWE access token available');
    }
    
    if (enableLogging) {
      console.log('🔑 TMWE Token ready (first 20 chars):', tmweAccessToken.substring(0, 20) + '...');
    }

    // 🚀 GESTIONE BATCH OPERATIONS (Mark as Read con array di message_ids)
    if (data.handler === 'mark_as_read' && Array.isArray(data.message_ids)) {
      const messageIds = data.message_ids;
      
      if (enableLogging) {
        console.log(`📧 Batch Mark as Read: ${messageIds.length} messaggi`);
        console.log(`⚡ Modalità: ${useSequentialExecution ? 'SEQUENTIAL' : useBatchParallelization ? 'CHUNKED_PARALLEL' : 'PARALLEL'}`);
      }
      
      let batchResults: any[];
      const batchStartTime = Date.now();
      
      if (useBatchParallelization && messageIds.length > batchChunkSize) {
        // CHUNKED PARALLEL (ottimale per batch grandi) 🧩
        const chunks = chunkArray(messageIds, batchChunkSize);
        if (enableLogging) console.log(`🧩 Chunking: ${chunks.length} chunks di ${batchChunkSize} messaggi`);
        
        const chunkPromises = chunks.map(chunk => 
          Promise.all(chunk.map(msgId => 
            fetch(`https://findair.it/erp/tmwe_json${endpoint}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tmweAccessToken}`,
                'Accept': 'application/json',
              },
              body: JSON.stringify({ handler: 'mark_as_read', message_id: msgId }),
            }).then(r => r.json())
          ))
        );
        const chunkResults = await Promise.all(chunkPromises);
        batchResults = chunkResults.flat();
      } else if (useSequentialExecution) {
        // SEQUENZIALE (lento)
        batchResults = [];
        for (const msgId of messageIds) {
          const singleResponse = await fetch(`https://findair.it/erp/tmwe_json${endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${tmweAccessToken}`,
              'Accept': 'application/json',
            },
            body: JSON.stringify({ handler: 'mark_as_read', message_id: msgId }),
          });
          const singleData = await singleResponse.json();
          batchResults.push(singleData);
        }
      } else {
        // PARALLELO (veloce per batch piccoli) 🚀
        const promises = messageIds.map(msgId => 
          fetch(`https://findair.it/erp/tmwe_json${endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${tmweAccessToken}`,
              'Accept': 'application/json',
            },
            body: JSON.stringify({ handler: 'mark_as_read', message_id: msgId }),
          }).then(r => r.json())
        );
        batchResults = await Promise.all(promises);
      }
      
      const batchEndTime = Date.now();
      
      if (enableLogging) {
        console.log(`✅ Batch completato in ${batchEndTime - batchStartTime}ms`);
      }
      
      return new Response(JSON.stringify({ 
        success: true, 
        marked: batchResults.filter((r: any) => r.success).length,
        total: messageIds.length,
        mark_type: 'read',
        errors: batchResults.filter((r: any) => !r.success),
        duration: batchEndTime - batchStartTime
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // BATCH DELETE MESSAGES
    if (data.handler === 'delete_messages' && Array.isArray(data.message_ids)) {
      const messageIds = data.message_ids;
      
      if (enableLogging) {
        console.log(`🗑️ Batch Delete Messages: ${messageIds.length} messaggi`);
        console.log(`⚡ Modalità: ${useSequentialExecution ? 'SEQUENTIAL' : useBatchParallelization ? 'CHUNKED_PARALLEL' : 'PARALLEL'}`);
      }
      
      let batchResults: any[];
      const batchStartTime = Date.now();
      
      if (useBatchParallelization && messageIds.length > batchChunkSize) {
        const chunks = chunkArray(messageIds, batchChunkSize);
        const chunkPromises = chunks.map(chunk => 
          Promise.all(chunk.map(msgId => 
            fetch(`https://findair.it/erp/tmwe_json${endpoint}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tmweAccessToken}`,
                'Accept': 'application/json',
              },
              body: JSON.stringify({ handler: 'delete_email', uid: msgId }),
            }).then(r => r.json())
          ))
        );
        const chunkResults = await Promise.all(chunkPromises);
        batchResults = chunkResults.flat();
      } else if (useSequentialExecution) {
        batchResults = [];
        for (const msgId of messageIds) {
          const singleResponse = await fetch(`https://findair.it/erp/tmwe_json${endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${tmweAccessToken}`,
              'Accept': 'application/json',
            },
            body: JSON.stringify({ handler: 'delete_email', uid: msgId }),
          });
          const singleData = await singleResponse.json();
          batchResults.push(singleData);
        }
      } else {
        const promises = messageIds.map(msgId => 
          fetch(`https://findair.it/erp/tmwe_json${endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${tmweAccessToken}`,
              'Accept': 'application/json',
            },
            body: JSON.stringify({ handler: 'delete_email', uid: msgId }),
          }).then(r => r.json())
        );
        batchResults = await Promise.all(promises);
      }
      
      const batchEndTime = Date.now();
      
      if (enableLogging) {
        console.log(`✅ Batch Delete completato in ${batchEndTime - batchStartTime}ms`);
      }
      
      return new Response(JSON.stringify({ 
        success: true, 
        deleted: batchResults.filter((r: any) => r.success).length,
        total: messageIds.length,
        errors: batchResults.filter((r: any) => !r.success),
        duration: batchEndTime - batchStartTime
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // BATCH MOVE MESSAGES
    if (data.handler === 'move_messages' && Array.isArray(data.message_ids) && data.target_folder) {
      const messageIds = data.message_ids;
      const targetFolder = data.target_folder;
      
      if (enableLogging) {
        console.log(`📁 Batch Move Messages: ${messageIds.length} messaggi -> ${targetFolder}`);
        console.log(`⚡ Modalità: ${useSequentialExecution ? 'SEQUENTIAL' : useBatchParallelization ? 'CHUNKED_PARALLEL' : 'PARALLEL'}`);
      }
      
      let batchResults: any[];
      const batchStartTime = Date.now();
      
      if (useBatchParallelization && messageIds.length > batchChunkSize) {
        const chunks = chunkArray(messageIds, batchChunkSize);
        const chunkPromises = chunks.map(chunk => 
          Promise.all(chunk.map(msgId => 
            fetch(`https://findair.it/erp/tmwe_json${endpoint}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tmweAccessToken}`,
                'Accept': 'application/json',
              },
              body: JSON.stringify({ handler: 'move_email', uid: msgId, target_folder: targetFolder }),
            }).then(r => r.json())
          ))
        );
        const chunkResults = await Promise.all(chunkPromises);
        batchResults = chunkResults.flat();
      } else if (useSequentialExecution) {
        batchResults = [];
        for (const msgId of messageIds) {
          const singleResponse = await fetch(`https://findair.it/erp/tmwe_json${endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${tmweAccessToken}`,
              'Accept': 'application/json',
            },
            body: JSON.stringify({ handler: 'move_email', uid: msgId, target_folder: targetFolder }),
          });
          const singleData = await singleResponse.json();
          batchResults.push(singleData);
        }
      } else {
        const promises = messageIds.map(msgId => 
          fetch(`https://findair.it/erp/tmwe_json${endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${tmweAccessToken}`,
              'Accept': 'application/json',
            },
            body: JSON.stringify({ handler: 'move_email', uid: msgId, target_folder: targetFolder }),
          }).then(r => r.json())
        );
        batchResults = await Promise.all(promises);
      }
      
      const batchEndTime = Date.now();
      
      if (enableLogging) {
        console.log(`✅ Batch Move completato in ${batchEndTime - batchStartTime}ms`);
      }
      
      return new Response(JSON.stringify({ 
        success: true, 
        moved: batchResults.filter((r: any) => r.success).length,
        total: messageIds.length,
        target_folder: targetFolder,
        errors: batchResults.filter((r: any) => !r.success),
        duration: batchEndTime - batchStartTime
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // 🚀 BATCH GET MESSAGES BY UIDS (Download email batch ottimizzato)
    if (data.handler === 'get_messages_by_uids' && Array.isArray(data.uids)) {
      const { folder, uids, include_attachments = true } = data;
      
      console.log(`📥 Batch Get Messages: ${uids.length} UIDs from ${folder}`);
      
      const batchStartTime = Date.now();
      const CONCURRENT_LIMIT = 5; // ✅ Max 5 chiamate parallele per chunk
      
      // Usa chunked parallel per evitare timeout (chunk size 5)
      const chunks = chunkArray(uids, CONCURRENT_LIMIT);
      console.log(`🧩 Processing ${chunks.length} chunks di ${CONCURRENT_LIMIT} UIDs max`);
      
      const messages: any[] = [];
      const errors: any[] = [];
      
      // Process chunks sequentially to avoid overload
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`📦 Processing chunk ${i + 1}/${chunks.length} (${chunk.length} UIDs)`);
        
        const chunkResults = await Promise.allSettled(
          chunk.map(uid => 
            fetch(`https://findair.it/erp/tmwe_json${endpoint}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tmweAccessToken}`,
                'Accept': 'application/json',
              },
              body: JSON.stringify({ 
                handler: 'get_message', 
                uid: uid,
                folder: folder,
                include_body: include_attachments
              }),
            }).then(async r => {
              if (!r.ok) throw new Error(`HTTP ${r.status}`);
              const data = await r.json();
              if (!data || !data.uid) throw new Error('Empty or invalid response');
              return data;
            })
          )
        );
        
        // Separate successful messages from errors
        chunkResults.forEach((result, idx) => {
          if (result.status === 'fulfilled' && result.value) {
            messages.push(result.value);
          } else {
            const uid = chunk[idx];
            console.warn(`⚠️ UID ${uid} skipped: ${result.status === 'rejected' ? result.reason : 'invalid'}`);
            errors.push({ uid, error: result.status === 'rejected' ? result.reason?.message : 'invalid response' });
          }
        });
      }
      
      const batchEndTime = Date.now();
      
      console.log(`✅ Batch completed in ${batchEndTime - batchStartTime}ms: ${messages.length}/${uids.length} downloaded, ${errors.length} skipped`);
      
      return new Response(JSON.stringify({
        success: true, 
        messages: messages,
        errors: errors,
        total_requested: uids.length,
        total_retrieved: messages.length,
        total_errors: errors.length,
        duration: batchEndTime - batchStartTime
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // NORMALE SINGLE REQUEST
    
    // ✅ NUOVO: Verifica circuit breaker
    if (data?.handler && !checkCircuitBreaker(data.handler)) {
      console.warn(`⚠️ Circuit Breaker OPEN per ${data.handler}, richiesta bloccata temporaneamente`);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Service temporarily unavailable',
          details: 'IMAP server health check failed, retry after cooldown',
          handler: data.handler,
          retry_after_ms: 60000
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // 🔥 v4.0 CRITICAL: EXPLICIT FOLDER PARAMETER VALIDATION & ENFORCEMENT
    // ═══════════════════════════════════════════════════════════════════════════
    // PROBLEMA IDENTIFICADO: El parámetro "folder" se estaba transformando a "folder_name"
    // SOLUCIÓN v4.0: Validación EXPLÍCITA que FUERZA "folder" y ELIMINA "folder_name"
    // ═══════════════════════════════════════════════════════════════════════════
    
    // 🔍 v5.0 LOG: Request parameters BEFORE validation
    console.log('═══════════════════════════════════════════════════════');
    console.log(`📥 [${V5_VERSION}] BEFORE VALIDATION - Timestamp: ${Date.now()}`);
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔹 Handler:', data.handler);
    console.log('🔹 All keys BEFORE:', Object.keys(data));
    console.log('🔹 data.folder BEFORE:', data.folder);
    console.log('🔹 data.folder_name BEFORE:', data.folder_name);
    console.log('═══════════════════════════════════════════════════════');
    
    // ⚡ v5.0 EXPLICIT VALIDATION: Force "folder" and remove "folder_name"
    if (data.handler === 'get_emails_metadata' || data.handler === 'get_message' || data.handler === 'search_emails') {
      // Si existe folder_name pero NO existe folder, usar folder_name como folder
      if (data.folder_name && !data.folder) {
        console.log('⚠️ [v4.0] CORRIGIENDO: folder_name existe pero folder no → Copiando folder_name a folder');
        data.folder = data.folder_name;
      }
      
      // Si NO existe folder en absoluto, usar INBOX por defecto
      if (!data.folder) {
        console.log('⚠️ [v4.0] CORRIGIENDO: folder missing → Default to INBOX');
        data.folder = 'INBOX';
      }
      
      // ELIMINAR folder_name si existe para evitar confusión
      if (data.folder_name) {
        console.log('🗑️ [v4.0] ELIMINANDO: folder_name para evitar confusión en backend');
        delete data.folder_name;
      }
      
      // Log after validation
      console.log('═══════════════════════════════════════════════════════');
      console.log(`✅ [${V5_VERSION}] AFTER VALIDATION`);
      console.log('═══════════════════════════════════════════════════════');
      console.log('🔹 All keys AFTER:', Object.keys(data));
      console.log('🔹 data.folder AFTER:', data.folder);
      console.log('🔹 data.folder_name AFTER:', data.folder_name);
      console.log('🔹 Final params:', JSON.stringify(data, null, 2));
      console.log('═══════════════════════════════════════════════════════');
    }
    
    const tmweUrl = `https://findair.it/erp/tmwe_json${endpoint}`;
    
    // 🔍 v5.0 LOGGING: VALIDATED parameters sent to TMWE backend
    console.log('═══════════════════════════════════════════════════════');
    console.log(`📤 [${V5_VERSION}] Sending VALIDATED params to TMWE API`);
    console.log('═══════════════════════════════════════════════════════');
    console.log('🌐 URL:', tmweUrl);
    console.log('🎯 Handler:', data.handler);
    console.log('📦 Parameters being sent:', JSON.stringify(data, null, 2));
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log(`🔢 Deploy Timestamp: ${V5_DEPLOY_TIMESTAMP}`);
    console.log('═══════════════════════════════════════════════════════');
    
    if (enableLogging) {
      console.log('📤 Chiamata a TMWE API:', tmweUrl);
      if (!useDoubleSerializat) {
        console.log('📦 Request body:', data);
      } else {
        console.log('📦 Request body:', JSON.stringify(data, null, 2));
      }
    }

    // ✅ NUOVO: Timeout con AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let tmweResponse: Response;
    try {
      tmweResponse = await fetch(tmweUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tmweAccessToken}`,
          'Accept': 'application/json',
        },
        body: JSON.stringify(data),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      // ✅ NUOVO: Gestione timeout
      if (fetchError.name === 'AbortError') {
        console.error('⏱️ TMWE API Timeout dopo', timeout, 'ms');
        if (data?.handler) recordFailure(data.handler, 'Timeout');
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'TMWE API timeout',
            timeout_ms: timeout,
            handler: data?.handler,
            retry_suggested: true
          }),
          { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw fetchError;
    }

    // Response processing ottimizzato o tradizionale
    let responseData: any;
    if (useTextResponse) {
      const responseText = await tmweResponse.text();
      responseData = responseText;
      
      if (enableLogging) {
        console.log('═══════════════════════════════════════════════════════');
        console.log('📥 RISPOSTA TMWE API');
        console.log('═══════════════════════════════════════════════════════');
        console.log('📊 Status:', tmweResponse.status, tmweResponse.statusText);
        console.log('📦 Response (primi 500 chars):', responseText.substring(0, 500));
        console.log('═══════════════════════════════════════════════════════');
      }
    } else {
      // Ottimizzazione: usa .json() diretto con gestione errori robusta
      try {
        // Leggi prima come testo per verificare se è vuoto
        const responseText = await tmweResponse.text();
        
        if (enableLogging) {
          console.log('═══════════════════════════════════════════════════════');
          console.log('📥 RISPOSTA TMWE API (Raw Text)');
          console.log('═══════════════════════════════════════════════════════');
          console.log('📊 Status:', tmweResponse.status, tmweResponse.statusText);
          console.log('📦 Content-Type:', tmweResponse.headers.get('content-type'));
          console.log('📦 Response length:', responseText.length);
          console.log('📦 Response (primi 500 chars):', responseText.substring(0, 500));
          console.log('═══════════════════════════════════════════════════════');
        }
        
        // Verifica se la risposta è vuota
        if (!responseText || responseText.trim().length === 0) {
          if (enableLogging) {
            console.error('⚠️ TMWE API ritornò risposta vuota');
          }
          responseData = { error: 'Empty response from TMWE API' };
        } else {
          // Prova a parsare come JSON
          try {
            responseData = JSON.parse(responseText);
            
            // 🔍 LOGGING: Analizar respuesta para get_emails_metadata
            if (enableLogging && data.handler === 'get_emails_metadata') {
              console.log('📂 [GET_EMAILS_METADATA] Response analysis:', {
                requestedFolder: data.folder || data.folder_name,
                responseSuccess: responseData?.success,
                emailsCount: responseData?.emails?.length,
                firstEmailFolder: responseData?.emails?.[0]?.folder,
                uniqueFolders: [...new Set(responseData?.emails?.map((e: any) => e.folder))],
                hasEmails: !!responseData?.emails
              });
            }
          } catch (parseError) {
            if (enableLogging) {
              console.error('⚠️ Risposta non è JSON valido, uso testo raw');
              console.error('Parse error:', parseError.message);
            }
            // Se non è JSON, ritorna il testo raw
            responseData = { 
              error: 'Invalid JSON response',
              raw: responseText.substring(0, 1000) // Primi 1000 chars
            };
          }
        }
      } catch (error) {
        if (enableLogging) {
          console.error('⚠️ Errore nel processamento della risposta:', error.message);
        }
        responseData = { 
          error: 'Failed to process response',
          details: error.message 
        };
      }
      
      if (enableLogging) {
        console.log('═══════════════════════════════════════════════════════');
        console.log('📥 RISPOSTA FINALE PROCESSATA');
        console.log('═══════════════════════════════════════════════════════');
      }
    }

    if (!tmweResponse.ok) {
      // ✅ NUOVO: Record failure nel circuit breaker
      if (data?.handler) {
        recordFailure(data.handler, responseData?.error || tmweResponse.statusText);
      }
      
      // LOGGING SEMPRE ATTIVO per errori (anche senza enableLogging)
      console.error('═══════════════════════════════════════════════════════');
      console.error('❌ ERRORE HTTP dalla TMWE API');
      console.error('═══════════════════════════════════════════════════════');
      console.error('📊 Status:', tmweResponse.status, tmweResponse.statusText);
      console.error('🔗 URL:', tmweUrl);
      console.error('📤 Request Handler:', data?.handler);
      console.error('📤 Request Body:', JSON.stringify(data, null, 2));
      console.error('📥 Response Data:', JSON.stringify(responseData, null, 2));
      console.error('═══════════════════════════════════════════════════════');
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `TMWE API Error: ${tmweResponse.status}`,
          details: responseData,
          requestSent: data // Includi la richiesta per debug
        }),
        {
          status: tmweResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ✅ NUOVO: Record success nel circuit breaker
    if (data?.handler) {
      recordSuccess(data.handler);
    }

    if (enableLogging) {
      console.log('✅ Risposta TMWE API riuscita');
    }

    return new Response(JSON.stringify({
      success: responseData?.success !== false,
      ...responseData
    }), {
      status: 200,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'X-Proxy-Version': V5_VERSION,
        'X-Deploy-Time': new Date().toISOString(),
        'X-Deploy-Timestamp': V5_DEPLOY_TIMESTAMP,
        'X-OAuth-Inline': 'auto-refresh-enabled'
      },
    });

  } catch (error: any) {
    console.log('═══════════════════════════════════════════════════════');
    console.error('🔥 ERRORE nel Proxy');
    console.log('═══════════════════════════════════════════════════════');
    console.error('⚠️ Error:', error);
    console.error('📄 Error Message:', error.message);
    console.log('═══════════════════════════════════════════════════════');
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
