// TMWE Email API Client integrato con Supabase Auth
import { supabase } from "@/integrations/supabase/client";

export interface ApiConfig {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  clientId?: string;
  clientSecret?: string;
}

// OAuth2 Configuration - Aggiornate con credenziali corrette
const OAUTH_CLIENT_ID = '30eb3689ecfe890adfda0578d61ad858cf9f98999a919e0cd7bb798df17b006f';
const OAUTH_CLIENT_SECRET = 'a6c592327aa191ab36769dded7b77b0396b9352';

// Load credentials from Supabase database
export const getApiConfigFromDB = async (): Promise<ApiConfig | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_tmwe_credentials')
    .select('*')
    .eq('user_id', user.id)
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
export const setApiConfigToDB = async (config: ApiConfig): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('User must be authenticated');

  const { error } = await supabase
    .from('user_tmwe_credentials')
    .upsert({
      user_id: user.id,
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

  await supabase
    .from('user_tmwe_credentials')
    .delete()
    .eq('user_id', user.id);
};

// OAuth2 Authorization Code Flow
export const initiateAuthorizationCodeFlow = (): void => {
  const clientId = OAUTH_CLIENT_ID;
  const clientSecret = OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('OAuth credentials not configured');
  }

  const state = Math.random().toString(36).substring(7) + Date.now().toString(36);
  const redirectUri = `${window.location.origin}/tmwe/callback`;
  
  // Store OAuth config in session storage for callback
  sessionStorage.setItem('oauth_state', state);
  sessionStorage.setItem('oauth_client_id', clientId);
  sessionStorage.setItem('oauth_client_secret', clientSecret);
  sessionStorage.setItem('oauth_redirect_uri', redirectUri);
  
  // Build authorization URL
  const authUrl = new URL('https://findair.it/erp/tmwe_json/auth');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('scope', 'read write');
  
  window.location.href = authUrl.toString();
};

// Refresh access token
export const refreshAccessToken = async (): Promise<boolean> => {
  const config = await getApiConfigFromDB();
  if (!config?.refreshToken || !config?.clientId) {
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
      ...config,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || config.refreshToken,
      expiresAt,
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

  console.group(`📤 API REQUEST: ${endpoint}`);
  console.log('Endpoint:', endpoint);
  console.log('Data:', data);
  console.groupEnd();

  try {
    const { data: responseData, error } = await supabase.functions.invoke('tmwe-api-proxy', {
      body: {
        endpoint,
        data,
        bearerToken: accessToken
      }
    });

    console.group(`📥 API RESPONSE: ${endpoint}`);
    if (error) {
      console.error('❌ Error Response:', error);
      console.groupEnd();
      throw new Error(error.message || 'API request failed');
    }

    console.log('✅ Success Response:', responseData);
    console.groupEnd();

    return responseData;
  } catch (error: any) {
    console.group(`🔥 API ERROR: ${endpoint}`);
    console.error('Error:', error);
    console.groupEnd();
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
