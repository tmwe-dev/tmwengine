// TMWE Email API Client integrato con Supabase Auth
import { supabase } from "@/integrations/supabase/client";

export interface ApiConfig {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  clientId?: string;
  clientSecret?: string;
}

// OAuth2 Configuration
const OAUTH_CLIENT_ID = '30eb3689ecfe890adfda0578d61ad858cf9f98999a919e0cd7bb798df17b006f';
const OAUTH_CLIENT_SECRET = '04d26799b3ec0a82dec492c2cb4a17a9ff20cabcde13166bd330e7ccd369c873a95b6d88c19cf4a6c592327aa191ab36769dded7b77b0396b93529b8b12035bd';

// Load credentials from Supabase database
export const getApiConfigFromDB = async (): Promise<ApiConfig | null> => {
  const userEmail = sessionStorage.getItem('tmwe_user_email');
  
  if (!userEmail) return null;

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
  
  sessionStorage.setItem('tmwe_user_email', config.email);
};

// Clear credentials from database
export const clearApiConfigFromDB = async (): Promise<void> => {
  const userEmail = sessionStorage.getItem('tmwe_user_email');
  
  if (!userEmail) return;

  await supabase
    .from('user_tmwe_credentials')
    .delete()
    .eq('email', userEmail);
    
  sessionStorage.removeItem('tmwe_user_email');
  sessionStorage.removeItem('tmwe_access_token');
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

// Refresh access token
export const refreshAccessToken = async (): Promise<boolean> => {
  const config = await getApiConfigFromDB();
  const userEmail = sessionStorage.getItem('tmwe_user_email');
  
  if (!config?.refreshToken || !config?.clientId || !userEmail) {
    return false;
  }

  try {
    const formData = new URLSearchParams();
    formData.append('grant_type', 'refresh_token');
    formData.append('client_id', config.clientId);
    formData.append('refresh_token', config.refreshToken);

    const response = await fetch('https://findair.it/erp/tmwe_json/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      await clearApiConfigFromDB();
      return false;
    }

    const data = await response.json();
    const expiresAt = Date.now() + (data.expires_in * 1000);
    
    await setApiConfigToDB({
      email: userEmail,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || config.refreshToken,
      expiresAt,
      clientId: config.clientId,
      clientSecret: config.clientSecret || OAUTH_CLIENT_SECRET,
    });

    return true;
  } catch (error) {
    console.error('Token refresh error:', error);
    await clearApiConfigFromDB();
    return false;
  }
};

// Ensure valid token
const ensureValidToken = async (): Promise<string | null> => {
  const config = await getApiConfigFromDB();
  if (!config) return null;

  // Check if token is expired or about to expire (5 minutes buffer)
  if (config.expiresAt && config.expiresAt < Date.now() + 300000) {
    const refreshed = await refreshAccessToken();
    if (!refreshed) return null;
    const newConfig = await getApiConfigFromDB();
    return newConfig?.accessToken || null;
  }

  return config.accessToken;
};

// API request wrapper
const fetchApi = async (endpoint: string, data: any) => {
  const accessToken = await ensureValidToken();
  
  if (!accessToken) {
    throw new Error('No valid token. Please login to TMWE first.');
  }

  const requestBody = {
    endpoint,
    data,
    bearerToken: accessToken
  };

  console.log('═══════════════════════════════════════════════════════');
  console.log('📤 SOLICITUD AL API TMWE');
  console.log('═══════════════════════════════════════════════════════');
  console.log('⏰ Timestamp:', new Date().toISOString());
  console.log('📍 Endpoint:', endpoint);
  console.log('🎯 Handler:', data.handler);
  console.log('📦 Request Body:', JSON.stringify(requestBody, null, 2));
  console.log('🔑 Token (primeros 20 chars):', accessToken.substring(0, 20) + '...');
  console.log('═══════════════════════════════════════════════════════');

  try {
    const { data: responseData, error } = await supabase.functions.invoke('tmwe-api-proxy', {
      body: requestBody
    });

    console.log('═══════════════════════════════════════════════════════');
    console.log('📥 RESPUESTA DEL API TMWE');
    console.log('═══════════════════════════════════════════════════════');
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('📍 Endpoint:', endpoint);
    console.log('🎯 Handler:', data.handler);
    
    if (error) {
      console.error('❌ ERROR en la respuesta');
      console.error('⚠️ Error Object:', error);
      console.error('📄 Error Message:', error.message);
      console.log('═══════════════════════════════════════════════════════');
      throw new Error(error.message || 'API request failed');
    }

    console.log('✅ RESPUESTA EXITOSA');
    console.log('📦 Response Data:', JSON.stringify(responseData, null, 2));
    console.log('═══════════════════════════════════════════════════════');

    return responseData;
  } catch (error: any) {
    console.log('═══════════════════════════════════════════════════════');
    console.error('🔥 ERROR EN LA COMUNICACIÓN');
    console.log('═══════════════════════════════════════════════════════');
    console.error('📍 Endpoint:', endpoint);
    console.error('🎯 Handler:', data.handler);
    console.error('⚠️ Error:', error);
    console.error('📄 Error Message:', error.message);
    console.error('📚 Stack Trace:', error.stack);
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
export const emailSyncApi = {
  fullSync: () => fetchApi('/email_sync', { handler: 'full_sync' }),
  incrementalSync: () => fetchApi('/email_sync', { handler: 'incremental_sync' }),
  syncFolder: (folderName: string) => 
    fetchApi('/email_sync', { handler: 'sync_folder', folder_name: folderName }),
  getSyncStatus: () => fetchApi('/email_sync', { handler: 'get_sync_status' }),
  cancelSync: () => fetchApi('/email_sync', { handler: 'cancel_sync' }),
};

// Email Message APIs
export const emailMessageApi = {
  getMessages: (params: {
    folder?: string;
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'ASC' | 'DESC';
  }) => fetchApi('/email_message', { handler: 'get_messages', ...params }),

  getMessage: (uid: string, markAsRead: boolean = true) => {
    const uidInt = parseInt(uid, 10);
    if (isNaN(uidInt)) throw new Error(`Invalid UID: ${uid}`);
    return fetchApi('/email_message', { handler: 'get_message', uid: uidInt, mark_as_read: markAsRead });
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

  deleteMessages: (uids: string[]) => {
    const uidInts = uids.map(uid => {
      const uidInt = parseInt(uid, 10);
      if (isNaN(uidInt)) throw new Error(`Invalid UID: ${uid}`);
      return uidInt;
    });
    return fetchApi('/email_message', { handler: 'delete_messages', uids: uidInts });
  },
};

// Email Folder APIs
export const emailFolderApi = {
  getFolders: () => fetchApi('/email_folder', { handler: 'get_folders' }),
  
  getFolderInfo: (folderName: string) => 
    fetchApi('/email_folder', { handler: 'get_folder_info', folder_name: folderName }),

  createFolder: (folderName: string, parentFolder?: string) => 
    fetchApi('/email_folder', { 
      handler: 'create_folder', 
      folder_name: folderName,
      parent_folder: parentFolder 
    }),

  deleteFolder: (folderName: string) => 
    fetchApi('/email_folder', { handler: 'delete_folder', folder_name: folderName }),

  renameFolder: (oldName: string, newName: string) => 
    fetchApi('/email_folder', { 
      handler: 'rename_folder', 
      old_name: oldName, 
      new_name: newName 
    }),
};

// Profile API
export const profileApi = {
  getMyProfile: () => fetchApi('/get_my_profile', { handler: 'get_my_profile' }),
};
