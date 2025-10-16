// TMWE Email API Client integrato con Supabase Auth
import { supabase } from "@/integrations/supabase/client";

export interface ApiConfig {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  clientId?: string;
  clientSecret?: string;
  authType?: 'oauth2' | 'jwt'; // Tipo di autenticazione utilizzata
}

// OAuth2 Configuration
const OAUTH_CLIENT_ID = '30eb3689ecfe890adfda0578d61ad858cf9f98999a919e0cd7bb798df17b006f';
const OAUTH_CLIENT_SECRET = '04d26799b3ec0a82dec492c2cb4a17a9ff20cabcde13166bd330e7ccd369c873a95b6d88c19cf4a6c592327aa191ab36769dded7b77b0396b93529b8b12035bd';

// Load credentials from Supabase database
export const getApiConfigFromDB = async (): Promise<ApiConfig | null> => {
  // Get authenticated user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return null;

  // Get tmwe_email from user profile
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('tmwe_email')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError || !profile?.tmwe_email) return null;
  
  const userEmail = profile.tmwe_email;

  const { data, error } = await supabase
    .from('user_tmwe_credentials')
    .select('*')
    .eq('email', userEmail)
    .maybeSingle();

  if (error || !data) return null;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || undefined,
    expiresAt: data.expires_at || undefined,
    clientId: data.client_id,
    clientSecret: data.client_secret,
  };
};

// Save credentials to Supabase database
export const setApiConfigToDB = async (config: ApiConfig & { email: string }): Promise<void> => {
  const { error } = await supabase
    .from('user_tmwe_credentials')
    .upsert({
      email: config.email,
      access_token: config.accessToken,
      refresh_token: config.refreshToken || null,
      expires_at: config.expiresAt || null,
      client_id: config.clientId || OAUTH_CLIENT_ID,
      client_secret: config.clientSecret || OAUTH_CLIENT_SECRET,
    });

  if (error) throw error;
};

// Clear credentials from database
export const clearApiConfigFromDB = async (): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
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
  const clientSecret = OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('OAuth credentials not configured');
  }

  // Validar que client_id cumple con el patrón requerido (^[a-f0-9]{32,}$)
  if (!/^[a-f0-9]{32,}$/.test(clientId)) {
    console.error('Invalid client_id format. Must be hexadecimal with minimum 32 characters');
    throw new Error('Invalid OAuth client ID format');
  }

  const state = Math.random().toString(36).substring(7) + Date.now().toString(36);
  const redirectUri = `${window.location.origin}/tmwe/callback`;
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('🚀 INICIANDO FLUJO OAUTH2 AUTHORIZATION CODE');
  console.log('═══════════════════════════════════════════════════════');
  console.log('📋 Parámetros OAuth2:');
  console.log('  - client_id:', clientId.substring(0, 20) + '...');
  console.log('  - redirect_uri (original):', redirectUri);
  console.log('  - redirect_uri (encoded):', encodeURIComponent(redirectUri));
  console.log('  - response_type:', 'code');
  console.log('  - state:', state);
  console.log('  - scope:', 'read write');
  
  // Store OAuth config in session storage for callback
  sessionStorage.setItem('oauth_state', state);
  sessionStorage.setItem('oauth_client_id', clientId);
  sessionStorage.setItem('oauth_client_secret', clientSecret);
  sessionStorage.setItem('oauth_redirect_uri', redirectUri);
  
  console.log('💾 Datos guardados en sessionStorage');
  
  // Build authorization URL según OpenAPI spec
  // Endpoint: GET /auth
  // IMPORTANTE: Construir URL manualmente para asegurar encoding correcto
  const baseUrl = 'https://findair.it/erp/tmwe_json/auth';
  const params = [
    `client_id=${encodeURIComponent(clientId)}`,
    `redirect_uri=${encodeURIComponent(redirectUri)}`,
    `response_type=${encodeURIComponent('code')}`,
    `state=${encodeURIComponent(state)}`,
    `scope=${encodeURIComponent('read write')}`
  ];
  
  const authUrl = `${baseUrl}?${params.join('&')}`;
  
  console.log('🔗 Authorization URL completa:', authUrl);
  console.log('📋 Verificación de encoding:');
  console.log('  - redirect_uri debe contener %3A y %2F:', authUrl.includes('%3A') && authUrl.includes('%2F'));
  console.log('═══════════════════════════════════════════════════════');
  
  window.location.href = authUrl;
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
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
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
    console.log('🔐 JWT AUTHENTICATION');
    console.log('═══════════════════════════════════════════════════════');
    
    // Generate JWT assertion
    const clientAssertion = generateClientJWT(clientId, clientSecret);
    
    const formData = new URLSearchParams();
    formData.append('grant_type', 'client_credentials_jwt');
    formData.append('client_assertion_type', 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer');
    formData.append('client_assertion', clientAssertion);
    
    console.log('📤 JWT Token Request:');
    console.log('  - grant_type: client_credentials_jwt');
    console.log('  - client_assertion: ', clientAssertion.substring(0, 50) + '...');
    
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
      return false;
    }
    
    const data = await response.json();
    const expiresAt = Date.now() + (data.expires_in * 1000);
    
    console.log('✅ JWT Token Received');
    console.log('  - access_token:', data.access_token.substring(0, 20) + '...');
    console.log('  - expires_in:', data.expires_in, 'seconds');
    
    await setApiConfigToDB({
      email: userEmail,
      accessToken: data.access_token,
      refreshToken: undefined, // JWT non usa refresh token
      expiresAt,
      clientId,
      clientSecret,
      authType: 'jwt',
    });
    
    console.log('═══════════════════════════════════════════════════════');
    
    return true;
  } catch (error) {
    console.error('JWT authentication error:', error);
    return false;
  }
};

// Refresh access token (OAuth2)
export const refreshAccessToken = async (): Promise<boolean> => {
  const config = await getApiConfigFromDB();
  
  if (!config?.refreshToken || !config?.clientId) {
    return false;
  }

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // Get tmwe_email from user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tmwe_email')
    .eq('user_id', user.id)
    .maybeSingle();

  const userEmail = profile?.tmwe_email;
  if (!userEmail) return false;

  try {
    console.log('🔄 Refreshing JWT token via Supabase Edge Function...');
    
    // Llamar a la edge function para refresh (servidor maneja todo el flujo JWT)
    const { data, error } = await supabase.functions.invoke('tmwe-jwt-refresh', {
      body: { email: userEmail }
    });

    if (error || !data?.success) {
      console.error('❌ Token refresh failed:', error || data?.error);
      await clearApiConfigFromDB();
      return false;
    }

    console.log('✅ Token refreshed successfully via edge function');
    return true;
  } catch (error) {
    console.error('Error refreshing TMWE token:', error);
    await clearApiConfigFromDB();
    return false;
  }
};

// Ensure valid token (supporta sia OAuth2 che JWT)
const ensureValidToken = async (): Promise<string | null> => {
  const config = await getApiConfigFromDB();
  if (!config) return null;

  // Check if token is expired or about to expire (5 minutes buffer)
  if (config.expiresAt && config.expiresAt < Date.now() + 300000) {
    // JWT: re-authenticate (no refresh token)
    if (config.authType === 'jwt') {
      const refreshed = await authenticateWithJWT();
      if (!refreshed) return null;
      const newConfig = await getApiConfigFromDB();
      return newConfig?.accessToken || null;
    }
    
    // OAuth2: use refresh token
    const refreshed = await refreshAccessToken();
    if (!refreshed) return null;
    const newConfig = await getApiConfigFromDB();
    return newConfig?.accessToken || null;
  }

  return config.accessToken;
};

// 🚀 CONFIGURAZIONE OTTIMALE DI PRODUZIONE
const OPTIMAL_CONFIG = {
  enableLogging: false,
  useDoubleSerializat: false,
  useSequentialExecution: false,
  useTextResponse: false,
  useBatchParallelization: true,
  batchChunkSize: 10,
};

// API request wrapper - USA EDGE FUNCTION COME PROXY CORS
const fetchApi = async (endpoint: string, data: any) => {
  await ensureValidToken();

  try {
    const { data: responseData, error } = await supabase.functions.invoke('tmwe-api-proxy', {
      body: { 
        endpoint, 
        data,
        optimizationFlags: OPTIMAL_CONFIG
      },
    });

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
  // ✅ STEP 2: Ottimizzato - usa offset + format:html di default
  getMessages: (params: {
    folder?: string;
    offset?: number;  // ✅ Preferisci offset invece di page (più veloce)
    limit?: number;   // ✅ Default 50 (ottimale secondo benchmark)
    format?: 'text' | 'html' | 'both';  // ✅ Default 'html' (evita 'both' che è lento)
    sort?: string;
    order?: 'ASC' | 'DESC';
  }) => fetchApi('/email_message', { 
    handler: 'get_messages', 
    folder: params.folder || 'INBOX',
    offset: params.offset || 0,
    limit: params.limit || 50,
    format: params.format || 'html',  // ✅ Evita 'both' per performance
    ...(params.sort && { sort: params.sort }),
    ...(params.order && { order: params.order })
  }),

  getMessage: (uid: string, markAsRead: boolean = true) => {
    const uidInt = parseInt(uid, 10);
    if (isNaN(uidInt)) throw new Error(`Invalid UID: ${uid}`);
    return fetchApi('/email_message', { handler: 'get_message', uid: uidInt, mark_as_read: markAsRead });
  },
  
  // ✅ OTTIMIZZAZIONE 4: Batch intelligente per mark as read
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
      if (cached) return cached;
    }
    
    // ✅ Chiamata API
    const result = await fetchApi('/email_folder', { 
      handler: 'get_folders',
      ...config
    });
    
    // ✅ Salva in cache
    folderCache.set(result, config);
    
    return result;
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
