// ═══════════════════════════════════════════════════════════════════════════
// TMWE API PROXY v5.1 - FORCE TOKEN VALIDATION FIX
// CRITICAL FIX: bearerToken bypass prevented auto-refresh - Now ALWAYS validates
// ═══════════════════════════════════════════════════════════════════════════
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// 🔥 v5.1 FORCE TOKEN VALIDATION - DO NOT REMOVE
const V5_REDEPLOY_TIMESTAMP = Date.now();
const V5_VERSION = 'v5.1-FORCE-TOKEN-VALIDATION-FIX';

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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body con gestione errori robusta
    let requestBody;
    try {
      const bodyText = await req.text();
      if (!bodyText || bodyText.trim().length === 0) {
        throw new Error('Empty request body');
      }
      requestBody = JSON.parse(bodyText);
    } catch (parseError) {
      console.error('═══════════════════════════════════════════════════════');
      console.error('🔥 ERRORE nel parsing del body della richiesta');
      console.error('═══════════════════════════════════════════════════════');
      console.error('⚠️ Error:', parseError.message);
      console.error('═══════════════════════════════════════════════════════');
      
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request body',
          details: parseError.message,
          hint: 'Request body must be valid JSON with endpoint and data fields'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
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

    // 🔑 INLINE OAUTH TOKEN MANAGEMENT (v5.1 - ALWAYS VALIDATE TOKEN)
    let tmweAccessToken: string | null = null;
    
    console.log(`[OAuth] 🔍 Fetching and validating token for: ${userEmail}`);
    
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
    console.log(`🔢 Redeploy Constant: ${V5_REDEPLOY_TIMESTAMP}`);
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
        'X-Redeploy-Timestamp': V5_REDEPLOY_TIMESTAMP.toString(),
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
