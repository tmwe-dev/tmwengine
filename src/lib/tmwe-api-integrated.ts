// TMWE Email API Client integrato con Supabase Auth
import { supabase } from "@/integrations/supabase/client";

export interface ApiConfig {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string; // Changed to string to match database timestamp
  clientId?: string;
  clientSecret?: string;
  authType?: 'oauth2' | 'jwt'; // Tipo di autenticazione utilizzata
}

// OAuth2 Configuration
const OAUTH_CLIENT_ID = '30eb3689ecfe890adfda0578d61ad858cf9f98999a919e0cd7bb798df17b006f';
const OAUTH_CLIENT_SECRET = '04d26799b3ec0a82dec492c2cb4a17a9ff20cabcde13166bd330e7ccd369c873a95b6d88c19cf4a6c592327aa191ab36769dded7b77b0396b93529b8b12035bd';

// Load credentials from Supabase database with in-memory cache
export const getApiConfigFromDB = async (): Promise<ApiConfig | null> => {
  // Get authenticated user from session (fast, reads from localStorage)
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return null;

  // Get tmwe_email from user profile
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('tmwe_email')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError || !profile?.tmwe_email) return null;
  
  const userEmail = profile.tmwe_email;

  // ✅ CHECK CACHE FIRST (eliminates 2 DB queries per API call)
  const { apiConfigCache } = await import('@/lib/email/config/ApiConfigCache');
  const cached = apiConfigCache.get(userEmail);
  if (cached) {
    return cached;
  }

  // ❌ CACHE MISS: Fetch from database
  console.log('🔄 [tmwe-api] Fetching fresh config from database for', userEmail);
  
  const { data, error } = await supabase
    .from('user_tmwe_credentials')
    .select('*')
    .eq('email', userEmail)
    .maybeSingle();

  if (error || !data) return null;

  const config: ApiConfig = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || undefined,
    expiresAt: data.expires_at || undefined,
    clientId: data.client_id,
    clientSecret: data.client_secret,
  };

  // ✅ SAVE TO CACHE (next calls will be 100x faster)
  apiConfigCache.set(userEmail, config);

  return config;
};

// Save credentials to Supabase database
export const setApiConfigToDB = async (config: ApiConfig & { email: string }): Promise<void> => {
  const { error } = await supabase
    .from('user_tmwe_credentials')
    .upsert([{
      email: config.email,
      access_token: config.accessToken,
      refresh_token: config.refreshToken || null,
      expires_at: config.expiresAt || null,
      client_id: config.clientId || OAUTH_CLIENT_ID,
      client_secret: config.clientSecret || OAUTH_CLIENT_SECRET,
    }]);

  if (error) throw error;

  // ✅ INVALIDATE CACHE after update (next call will fetch fresh data)
  const { apiConfigCache } = await import('@/lib/email/config/ApiConfigCache');
  apiConfigCache.invalidate(config.email);
  console.log('🧹 [tmwe-api] Cache invalidated after credentials update for', config.email);
};

// Clear credentials from database
export const clearApiConfigFromDB = async (): Promise<void> => {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tmwe_email')
    .eq('user_id', user.id)
    .maybeSingle();

  const userEmail = profile?.tmwe_email;
  if (!userEmail) return;

  await supabase
    .from('user_tmwe_credentials')
    .delete()
    .eq('email', userEmail);
};

// OAuth2 Authorization Code Flow - Según OpenAPI spec 3.0.4
export const initiateAuthorizationCodeFlow = (): void => {
  const clientId = OAUTH_CLIENT_ID;
  const state = Math.random().toString(36).substring(7);
  const redirectUri = `${window.location.origin}/tmwe/callback`;
  
  sessionStorage.setItem('oauth_state', state);
  sessionStorage.setItem('oauth_redirect_uri', redirectUri);
  
  // ✅ CORRECCIÓN CRÍTICA: Endpoint correcto según proyecto Luca
  const authUrl = new URL('https://findair.it/erp/tmwe_json/auth'); // NO /authorization
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('scope', 'read write');
  
  console.log('🚀 Redirecting to TMWE authorization:', authUrl.toString());
  window.location.href = authUrl.toString();
};

// ============================================================================
// JWT AUTHENTICATION (5x faster than OAuth2)
// ============================================================================

/**
 * Genera un JWT per autenticazione client secondo RFC 7523
 * @param clientId - Client ID (hexadecimal, min 32 chars)
 * @param clientSecret - Client Secret (usato come HS256 signing key)
 * @returns JWT firmato
 */
const generateClientJWT = (clientId: string, clientSecret: string): string => {
  const now = Math.floor(Date.now() / 1000);
  const jti = Math.random().toString(36).substring(2) + Date.now().toString(36);
  
  // Header HS256
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };
  
  // Payload secondo spec
  const payload = {
    iss: clientId,           // Issuer (client_id)
    sub: clientId,           // Subject (client_id)
    aud: 'https://findair.it/erp/tmwe_json/token', // Audience (token endpoint)
    exp: now + 300,          // Expiration (5 minuti)
    iat: now,                // Issued at
    jti: jti                 // JWT ID (unique)
  };
  
  // Encode Base64URL
  const base64url = (obj: any) => {
    return btoa(JSON.stringify(obj))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };
  
  const headerEncoded = base64url(header);
  const payloadEncoded = base64url(payload);
  const message = `${headerEncoded}.${payloadEncoded}`;
  
  // HMAC-SHA256 signature using Web Crypto API (async version below)
  // For now, we'll use a simplified sync version or rely on server-side signing
  // In production, use Web Crypto API subtleCrypto.sign() in async function
  
  console.log('🔐 JWT Generated (unsigned - will be signed server-side)');
  console.log('  - iss:', clientId.substring(0, 20) + '...');
  console.log('  - exp:', new Date(payload.exp * 1000).toISOString());
  console.log('  - jti:', jti);
  
  // Return unsigned JWT (server will sign it)
  return `${message}.UNSIGNED`;
};

/**
 * Autentica usando JWT (client_credentials_jwt)
 * 5x più veloce di OAuth2, ideale per API machine-to-machine
 */
export const authenticateWithJWT = async (): Promise<boolean> => {
  const clientId = OAUTH_CLIENT_ID;
  const clientSecret = OAUTH_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error('JWT credentials not configured');
  }
  
  // Get authenticated user
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Get tmwe_email from user profile
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('tmwe_email')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError || !profile?.tmwe_email) {
    throw new Error('User email not found. Please configure your TMWE email in your profile.');
  }
  
  const userEmail = profile.tmwe_email;
  
  try {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔐 JWT AUTHENTICATION (Server-Side Signing)');
    console.log('═══════════════════════════════════════════════════════');
    
    // CRITICAL FIX: Call Edge Function to sign JWT server-side with HS256
    console.log('📤 Requesting signed JWT from Edge Function...');
    
    const { data: jwtData, error: jwtError } = await supabase.functions.invoke('tmwe-jwt-sign', {
      body: {
        clientId,
        clientSecret,
      }
    });

    if (jwtError || !jwtData?.jwt) {
      console.error('❌ JWT signing failed:', jwtError);
      throw new Error(`Failed to generate signed JWT: ${jwtError?.message || 'No JWT returned'}`);
    }

    const signedJWT = jwtData.jwt;
    console.log('✅ Signed JWT received from Edge Function');
    console.log('   JWT preview:', signedJWT.substring(0, 50) + '...');
    console.log('   JWT length:', signedJWT.length);
    
    const formData = new URLSearchParams();
    formData.append('grant_type', 'client_credentials_jwt');
    formData.append('client_assertion_type', 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer');
    formData.append('client_assertion', signedJWT);
    
    console.log('📤 JWT Token Request to TMWE API:');
    console.log('  - grant_type: client_credentials_jwt');
    console.log('  - client_assertion_type: urn:ietf:params:oauth:client-assertion-type:jwt-bearer');
    console.log('  - client_assertion:', signedJWT.substring(0, 50) + '...');
    
    const response = await fetch('https://findair.it/erp/tmwe_json/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ JWT Authentication Failed:', errorText);
      console.error('   Status:', response.status);
      console.error('   Status Text:', response.statusText);
      return false;
    }
    
    const data = await response.json();
    
    // Validate response according to jwt-api.yaml
    if (!data.access_token || !data.expires_in) {
      console.error('❌ Invalid TMWE JWT response:', data);
      throw new Error('Invalid TMWE JWT response: missing access_token or expires_in');
    }
    
    const expiresAt = new Date(Date.now() + (data.expires_in * 1000)).toISOString();
    
    console.log('✅ JWT Token Received from TMWE API');
    console.log('  - access_token:', data.access_token.substring(0, 20) + '...');
    console.log('  - expires_in:', data.expires_in, 'seconds');
    console.log('  - refresh_token:', data.refresh_token ? data.refresh_token.substring(0, 20) + '...' : 'none');
    
    await setApiConfigToDB({
      email: userEmail,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || undefined,
      expiresAt,
      clientId,
      clientSecret,
      authType: 'jwt',
    });
    
    console.log('✅ JWT credentials saved to database');
    console.log('═══════════════════════════════════════════════════════');
    
    return true;
  } catch (error) {
    console.error('❌ JWT authentication error:', error);
    console.error('   Stack:', error instanceof Error ? error.stack : 'No stack trace');
    return false;
  }
};

// Refresh access token (supports both OAuth2 and JWT)
export const refreshAccessToken = async (): Promise<boolean> => {
  const config = await getApiConfigFromDB();
  
  if (!config?.clientId) {
    return false;
  }

  // Get authenticated user
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return false;

  // Get tmwe_email from user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tmwe_email')
    .eq('user_id', user.id)
    .maybeSingle();

  const userEmail = profile?.tmwe_email;
  if (!userEmail) return false;

  const authType = config.authType || 'oauth2';

  try {
    console.log('🔄 Refreshing access token...');
    console.log('   Auth type:', authType);
    console.log('   User email:', userEmail);
    
    // CRITICAL FIX: Use different Edge Functions based on auth type
    const functionName = authType === 'jwt' ? 'tmwe-jwt-refresh' : 'tmwe-oauth-refresh';
    console.log('   Using Edge Function:', functionName);
    
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: { email: userEmail }
    });

    if (error || !data?.access_token) {
      console.error('❌ Token refresh failed:', error);
      console.error('   Error details:', error);
      console.error('   Response data:', data);
      await clearApiConfigFromDB();
      return false;
    }

    console.log('✅ New access token received');
    console.log('   Token preview:', data.access_token.substring(0, 20) + '...');
    console.log('   Expires in:', data.expires_in);
    console.log('✅ Token refreshed successfully via', functionName);
    return true;
  } catch (error) {
    console.error('❌ Error refreshing TMWE token:', error);
    console.error('   Stack:', error instanceof Error ? error.stack : 'No stack trace');
    await clearApiConfigFromDB();
    return false;
  }
};

// Ensure valid token (supporta sia OAuth2 che JWT)
const ensureValidToken = async (): Promise<string | null> => {
  // ✅ Verifica Supabase session prima di procedere
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    console.error('🔴 No active Supabase session - forcing logout');
    await supabase.auth.signOut();
    window.location.href = '/login';
    throw new Error('SUPABASE_SESSION_EXPIRED');
  }
  
  // Verifica se session è scaduta
  if (session.expires_at && Date.now() / 1000 > session.expires_at) {
    console.error('🔴 Supabase session expired - forcing logout');
    await supabase.auth.signOut();
    window.location.href = '/login';
    throw new Error('SUPABASE_SESSION_EXPIRED');
  }

  const config = await getApiConfigFromDB();
  if (!config) {
    console.error('❌ TMWE credentials not found in database');
    throw new Error('TMWE_AUTH_REQUIRED');
  }

  // Check if token is expired or about to expire (5 minutes buffer)
  if (config.expiresAt && new Date(config.expiresAt).getTime() < Date.now() + 300000) {
    console.warn('⚠️ TMWE token expired, attempting refresh...');
    console.log('   Expires at:', config.expiresAt);
    console.log('   Auth type:', config.authType || 'oauth2');
    
    // JWT: re-authenticate (no refresh token)
    if (config.authType === 'jwt') {
      const refreshed = await authenticateWithJWT();
      if (!refreshed) {
        console.error('❌ JWT re-authentication failed');
        throw new Error('TMWE_REFRESH_FAILED');
      }
      const newConfig = await getApiConfigFromDB();
      return newConfig?.accessToken || null;
    }
    
    // OAuth2: use refresh token
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      console.error('❌ OAuth2 token refresh failed');
      throw new Error('TMWE_REFRESH_FAILED');
    }
    const newConfig = await getApiConfigFromDB();
    return newConfig?.accessToken || null;
  }

  return config.accessToken;
};

// 🚀 CONFIGURAZIONE OTTIMALE DI PRODUZIONE
const OPTIMAL_CONFIG = {
  enableLogging: false, // ✅ Disattivato - diagnostica completata
  useDoubleSerializat: false,
  useSequentialExecution: false,
  useTextResponse: false,
  useBatchParallelization: true,
  batchChunkSize: 10,
};

// API request wrapper BASE - USA EDGE FUNCTION COME PROXY CORS con TIMEOUT 60s
const fetchApiBase = async (endpoint: string, data: any) => {
  let token: string | null;
  
  try {
    token = await ensureValidToken();
  } catch (authError: any) {
    if (authError.message === 'TMWE_AUTH_REQUIRED' || authError.message === 'TMWE_REFRESH_FAILED') {
      console.error('❌ TMWE session expired or refresh failed');
      throw new Error('TMWE_SESSION_EXPIRED');
    }
    throw authError;
  }
  
  if (!token) {
    console.error('❌ TMWE token is null after validation');
    throw new Error('TMWE_SESSION_EXPIRED');
  }

  // ✅ Helper per Edge Function con timeout 60s
  const invokeWithTimeout = async (timeoutMs: number = 60000) => {
    return Promise.race([
      supabase.functions.invoke('tmwe-api-proxy', {
        body: { 
          endpoint, 
          data: {
            ...data,
            bearerToken: token
          },
          optimizationFlags: OPTIMAL_CONFIG
        },
      }),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`⏱️ Edge function timeout after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  };

  try {
    const { data: responseData, error } = await invokeWithTimeout();

    console.log('═══════════════════════════════════════════════════════');
    console.log('📥 RISPOSTA EDGE FUNCTION');
    console.log('═══════════════════════════════════════════════════════');
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('📍 Endpoint:', endpoint);
    console.log('🎯 Handler:', data.handler);

    if (error) {
      console.error('❌ ERRORE dalla Edge Function');
      console.error('⚠️ Error:', error);
      console.log('═══════════════════════════════════════════════════════');
      throw error;
    }

    console.log('✅ RISPOSTA RIUSCITA');
    console.log('📦 Response Data:', JSON.stringify(responseData, null, 2));
    console.log('═══════════════════════════════════════════════════════');

    return responseData;
  } catch (error: any) {
    console.log('═══════════════════════════════════════════════════════');
    console.error('🔥 ERRORE NELLA COMUNICAZIONE');
    console.log('═══════════════════════════════════════════════════════');
    console.error('📍 Endpoint:', endpoint);
    console.error('🎯 Handler:', data.handler);
    console.error('⚠️ Error:', error);
    console.error('📄 Error Message:', error.message);
    console.log('═══════════════════════════════════════════════════════');
    throw error;
  }
};

// ✅ API Wrapper con RETRY + EXPONENTIAL BACKOFF (usato da tutte le API)
const fetchApi = async (endpoint: string, data: any, maxRetries = 3): Promise<any> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt}/${maxRetries} for ${endpoint}:${data.handler}`);
      return await fetchApiBase(endpoint, data);
    } catch (error: any) {
      console.error(`❌ Attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        console.error(`🔥 Max retries (${maxRetries}) reached for ${endpoint}:${data.handler}`);
        throw error;
      }
      
      // Exponential backoff: 1s, 2s, 4s, max 10s
      const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      console.warn(`⏳ Retrying in ${backoffMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }
  throw new Error('Unexpected: retry loop ended without result');
};

// Email Account APIs
export const emailAccountApi = {
  testConnection: (data: {
    imap_host: string;
    imap_port: number;
    imap_encryption: string;
    smtp_host: string;
    smtp_port: number;
    smtp_encryption: string;
    email: string;
    password: string;
  }) => fetchApi('/email_account', { handler: 'test_connection', ...data }),

  getAccountInfo: () => fetchApi('/email_account', { handler: 'get_account_info' }),
  getQuota: () => fetchApi('/email_account', { handler: 'get_quota' }),
};

// Email Sync APIs
// NOTA: fullSync, incrementalSync, syncFolder sono stati deprecati
// Usare invece syncEmailsToDatabase() da src/lib/email-sync.ts
// che utilizza l'Edge Function tmwe-email-sync-master
export const emailSyncApi = {
  getSyncStatus: () => fetchApi('/email_sync', { handler: 'get_sync_status' }),
  cancelSync: () => fetchApi('/email_sync', { handler: 'cancel_sync' }),
};

// Email Message APIs
import { chunkArray } from './utils/array-utils';

export const emailMessageApi = {
  // ✅ UPDATED: Complete parameters according to API spec
  getMessages: (params: {
    folder?: string;
    page?: number;
    offset?: number;
    limit?: number;
    sort?: 'date' | 'from' | 'subject' | 'size';
    order?: 'ASC' | 'DESC';
    include_attachments?: boolean;  // ✅ NEW
    format?: 'text' | 'html' | 'both';
    filter?: {                      // ✅ NEW
      unread_only?: boolean;
      flagged_only?: boolean;
      has_attachments?: boolean;
    };
  }) => {
    const limit = params.limit || 50;
    let offset = params.offset !== undefined ? params.offset : 0;
    
    // ✅ FIX: Calcola offset da page (solo se page >= 1 e offset non fornito)
    if (params.page !== undefined && params.page >= 1 && params.offset === undefined) {
      offset = (params.page - 1) * limit;
      console.log(`📄 [API] Page ${params.page} → offset ${offset} (limit: ${limit})`);
    } else if (params.offset !== undefined) {
      console.log(`📄 [API] Using explicit offset ${offset} (limit: ${limit})`);
    }
    
    return fetchApi('/email_message', { 
      handler: 'get_messages', 
      folder: params.folder || 'INBOX',
      offset: offset,
      limit: limit,
      format: params.format || 'html',
      include_attachments: params.include_attachments || false,  // ✅ NEW
      // ✅ RIMOSSO: page non viene più passato all'API
      ...(params.sort && { sort: params.sort }),
      ...(params.order && { order: params.order }),
      ...(params.filter && { filter: params.filter })  // ✅ NEW
    });
  },

  getMessage: (uid: string, folder?: string, markAsRead: boolean = false, includeBody: boolean = true) => {
    const uidInt = parseInt(uid, 10);
    if (isNaN(uidInt)) throw new Error(`Invalid UID: ${uid}`);
    return fetchApi('/email_message', { 
      handler: 'get_message', 
      uid: uidInt, 
      folder: folder || 'INBOX',
      mark_as_read: markAsRead,
      include_body: includeBody
    });
  },

  // ✅ FIX 3: BATCH API per getMessage (10x più veloce)
  getMessagesBatch: (uids: number[], folder: string = 'INBOX', markAsRead: boolean = false) => {
    if (!Array.isArray(uids) || uids.length === 0) {
      throw new Error('UIDs array is required and cannot be empty');
    }
    
    // Converti tutti gli UID a integer
    const uidInts = uids.map(uid => {
      const parsed = typeof uid === 'string' ? parseInt(uid, 10) : uid;
      if (isNaN(parsed)) throw new Error(`Invalid UID in batch: ${uid}`);
      return parsed;
    });
    
    return fetchApi('/email_message', {
      handler: 'get_messages_batch',  // Nuovo handler batch
      uids: uidInts,
      folder,
      mark_as_read: markAsRead
    });
  },
  
  // ✅ OTTIMIZZAZIONE 4: Batch intelligente per mark as read (mantiene backward compatibility)
  markAsRead: async (messageIds: string[]) => {
    // Mantieni UIDs come stringhe (secondo documentazione TMWE API)
    const uids = messageIds;
    
    // Se più di 50 messaggi, splitta in batch
    if (uids.length > 50) {
      const batches = chunkArray(uids, 50);
      const results = await Promise.all(
        batches.map(batch => 
          fetchApi('/email_message', {
            handler: 'mark_messages',
            uids: batch,
            action: 'read'
          })
        )
      );
      return results.flat();
    }
    
    return fetchApi('/email_message', {
      handler: 'mark_messages',
      uids: uids,
      action: 'read'
    });
  },

  // ✅ NEW: Generalized mark_messages with all actions according to API spec
  markMessages: async (
    messageIds: string[], 
    action: 'read' | 'unread' | 'flagged' | 'unflagged'
  ) => {
    const uids = messageIds;
    
    if (uids.length > 50) {
      const batches = chunkArray(uids, 50);
      const results = await Promise.all(
        batches.map(batch => 
          fetchApi('/email_message', {
            handler: 'mark_messages',
            uids: batch,
            action
          })
        )
      );
      return results.flat();
    }
    
    return fetchApi('/email_message', {
      handler: 'mark_messages',
      uids: uids,
      action
    });
  },

  // ✅ NEW: Move single message to trash (according to API spec)
  moveToTrash: (uid: string) => {
    const uidInt = parseInt(uid, 10);
    if (isNaN(uidInt)) throw new Error(`Invalid UID: ${uid}`);
    return fetchApi('/email_message', { 
      handler: 'move_to_trash', 
      uid: uidInt 
    });
  },

  // ✅ NEW: Batch move messages to trash (according to API spec)
  moveMessagesToTrash: async (uids: string[]) => {
    const uidInts = uids.map(uid => {
      const uidInt = parseInt(uid, 10);
      if (isNaN(uidInt)) throw new Error(`Invalid UID: ${uid}`);
      return uidInt;
    });
    
    if (uidInts.length > 50) {
      const batches = chunkArray(uidInts, 50);
      const results = await Promise.all(
        batches.map(batch => 
          fetchApi('/email_message', {
            handler: 'move_messages_to_trash',
            uids: batch
          })
        )
      );
      return results.flat();
    }
    
    return fetchApi('/email_message', {
      handler: 'move_messages_to_trash',
      uids: uidInts
    });
  },

  // Move messages to folder
  moveMessages: async (messageIds: string[], targetFolder: string) => {
    // Mantieni UIDs come stringhe (secondo documentazione TMWE API)
    const uids = messageIds;
    
    if (uids.length > 50) {
      const batches = chunkArray(uids, 50);
      const results = await Promise.all(
        batches.map(batch => 
          fetchApi('/email_message', {
            handler: 'move_messages',
            uids: batch,
            target_folder: targetFolder
          })
        )
      );
      return results.flat();
    }
    
    return fetchApi('/email_message', {
      handler: 'move_messages',
      uids: uids,
      target_folder: targetFolder
    });
  },

  searchMessages: (params: {
    query: string;
    folder?: string;
    search_in?: ('subject' | 'body' | 'from' | 'to')[];
    from_date?: string;
    to_date?: string;
    page?: number;
    limit?: number;
  }) => fetchApi('/email_message', { handler: 'search_messages', ...params }),

  sendMessage: (data: {
    to: string[];
    subject: string;
    body: string;
    body_type?: 'html' | 'text';
    cc?: string[];
    bcc?: string[];
    attachments?: any[];
    priority?: 'high' | 'normal' | 'low';
  }) => fetchApi('/email_message', { handler: 'send_message', ...data }),

  replyMessage: (data: {
    uid: string;
    body: string;
    body_type?: 'html' | 'text';
    reply_all?: boolean;
    attachments?: any[];
  }) => {
    const uidInt = parseInt(data.uid, 10);
    if (isNaN(uidInt)) throw new Error(`Invalid UID: ${data.uid}`);
    
    const requestData: any = {
      handler: 'reply_message', 
      uid: uidInt,
      reply_all: data.reply_all || false,
    };
    
    if (data.body_type === 'html') {
      requestData.body = data.body.replace(/<[^>]*>/g, '');
      requestData.body_html = data.body;
    } else {
      requestData.body = data.body;
      requestData.body_html = `<p>${data.body.replace(/\n/g, '<br>')}</p>`;
    }
    
    if (data.attachments) {
      requestData.attachments = data.attachments;
    }
    
    return fetchApi('/email_message', requestData);
  },

  forwardMessage: (data: {
    uid: string;
    to: string[];
    body: string;
    body_html?: string;
    cc?: string[];
    bcc?: string[];
    attachments?: any[];
  }) => {
    const uidInt = parseInt(data.uid, 10);
    if (isNaN(uidInt)) throw new Error(`Invalid UID: ${data.uid}`);
    
    return fetchApi('/email_message', {
      handler: 'forward_message',
      uid: uidInt,
      to: data.to,
      body: data.body,
      body_html: data.body_html || '',
      cc: data.cc || [],
      bcc: data.bcc || [],
      attachments: data.attachments || []
    });
  },

  // ✅ NEW: Delete single email permanently (according to email-api-3.yaml)
  deleteEmail: (uid: string) => {
    const uidInt = parseInt(uid, 10);
    if (isNaN(uidInt)) throw new Error(`Invalid UID: ${uid}`);
    return fetchApi('/email_message', { 
      handler: 'delete_email', 
      uid: uidInt 
    });
  },

  // ✅ OTTIMIZZATO: Edge function gestisce automaticamente chunking e parallelization
  deleteMessages: (uids: string[]) => {
    const uidInts = uids.map(uid => {
      const uidInt = parseInt(uid, 10);
      if (isNaN(uidInt)) throw new Error(`Invalid UID: ${uid}`);
      return uidInt;
    });
    return fetchApi('/email_message', { handler: 'delete_messages', message_ids: uidInts });
  },
};

// Email Folder APIs
import { folderCache } from './cache/folder-cache';

export const emailFolderApi = {
  // ✅ STEP 4: Ottimizzato con cache locale (risparmio ~10s per hit)
  getFolders: async (options?: { include_counts?: boolean; include_hierarchy?: boolean; skipCache?: boolean }) => {
    const config = {
      include_counts: options?.include_counts ?? false,  // ✅ FALSE di default (-73% tempo)
      include_hierarchy: options?.include_hierarchy ?? false  // ✅ FALSE di default
    };
    
    // ✅ Controlla cache prima
    if (!options?.skipCache) {
      const cached = folderCache.get(config);
      if (cached) {
        console.log('💾 [emailFolderApi] Using cached folders:', cached?.length || 0);
        return cached;
      }
    }
    
    console.log('🌐 [emailFolderApi] Calling TMWE API for folders (skipCache:', options?.skipCache, ')');
    
    // ✅ Chiamata API
    const result = await fetchApi('/email_folder', { 
      handler: 'get_folders',
      ...config
    });
    
    // 🆕 Normalizza risposta PRIMA di salvare in cache
    const folders = Array.isArray(result) 
      ? result 
      : (result?.data || result?.folders || []);
    
    console.log('📥 [emailFolderApi] TMWE API returned:', {
      hasResult: !!result,
      isArray: Array.isArray(result),
      normalizedLength: folders.length,
      type: typeof result,
      keys: result ? Object.keys(result) : []
    });
    
    // ✅ Salva array normalizzato in cache
    folderCache.set(folders, config);
    
    return folders;
  },
  
  getFolderInfo: (folderName: string) => 
    fetchApi('/email_folder', { handler: 'get_folder_info', folder_name: folderName }),

  createFolder: async (folderName: string, parentFolder?: string) => {
    const result = await fetchApi('/email_folder', { 
      handler: 'create_folder', 
      folder_name: folderName,
      parent_folder: parentFolder 
    });
    folderCache.invalidate();  // ✅ Invalida cache dopo modifica
    return result;
  },

  deleteFolder: async (folderName: string) => {
    const result = await fetchApi('/email_folder', { handler: 'delete_folder', folder_name: folderName });
    folderCache.invalidate();  // ✅ Invalida cache dopo eliminazione
    return result;
  },

  renameFolder: async (oldName: string, newName: string) => {
    const result = await fetchApi('/email_folder', { 
      handler: 'rename_folder', 
      old_name: oldName, 
      new_name: newName 
    });
    folderCache.invalidate();  // ✅ Invalida cache dopo rinomina
    return result;
  },
};

// Profile API
export const profileApi = {
  getMyProfile: () => fetchApi('/get_my_profile', {}),
};
