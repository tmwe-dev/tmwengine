// TMWE Email API Client via Edge Function
import { supabase } from "@/integrations/supabase/client";

export interface ApiConfig {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  clientId?: string;
  clientSecret?: string;
}

let apiConfig: ApiConfig | null = null;

export const setApiConfig = (config: ApiConfig) => {
  apiConfig = config;
  localStorage.setItem('tmwe_api_config', JSON.stringify(config));
};

export const getApiConfig = (): ApiConfig | null => {
  if (apiConfig) return apiConfig;
  
  const stored = localStorage.getItem('tmwe_api_config');
  if (stored) {
    try {
      apiConfig = JSON.parse(stored);
      return apiConfig;
    } catch {
      return null;
    }
  }
  
  return null;
};

export const clearApiConfig = () => {
  apiConfig = null;
  localStorage.removeItem('tmwe_api_config');
};

// OAuth2 Configuration
const OAUTH_CLIENT_ID = '30eb3689ecfe890adfda0578d61ad858cf9f98999a919e0cd7bb798df17b006f';
const OAUTH_CLIENT_SECRET = '04d26799b3ec0a82dec492c2cb4a17a9ff20cabcde13166bd330e7ccd369c873a95b6d88c19cf4a6c592327aa191ab36769dded7b77b0396b93529b8b12035bd';

// OAuth2 Authorization Code Flow - Redirect to authorization page
export const initiateAuthorizationCodeFlow = (): void => {
  const clientId = OAUTH_CLIENT_ID;
  const clientSecret = OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('OAuth credentials not configured. Please provide client_id and client_secret.');
  }

  const state = Math.random().toString(36).substring(7) + Date.now().toString(36);
  const redirectUri = `${window.location.origin}/tmwe/callback`;
  
  // Store OAuth config in session storage for callback
  sessionStorage.setItem('oauth_state', state);
  sessionStorage.setItem('oauth_client_id', clientId);
  sessionStorage.setItem('oauth_client_secret', clientSecret);
  sessionStorage.setItem('oauth_redirect_uri', redirectUri);
  
  // Build authorization URL (URLSearchParams handles encoding automatically)
  const authUrl = new URL('https://findair.it/erp/tmwe_json/auth');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('scope', 'read write');
  
  // Redirect to authorization page
  window.location.href = authUrl.toString();
};

export const refreshAccessToken = async (): Promise<boolean> => {
  const config = getApiConfig();
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
      console.error('Token refresh failed');
      clearApiConfig();
      return false;
    }

    const data = await response.json();
    const expiresAt = Date.now() + (data.expires_in * 1000);
    
    setApiConfig({
      ...config,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || config.refreshToken,
      expiresAt,
    });

    return true;
  } catch (error) {
    console.error('Token refresh error:', error);
    clearApiConfig();
    return false;
  }
};

const ensureValidToken = async (): Promise<string | null> => {
  const config = getApiConfig();
  if (!config) return null;

  // Check if token is expired or about to expire (5 minutes buffer)
  if (config.expiresAt && config.expiresAt < Date.now() + 300000) {
    const refreshed = await refreshAccessToken();
    if (!refreshed) return null;
    return getApiConfig()?.accessToken || null;
  }

  return config.accessToken;
};

const fetchApi = async (endpoint: string, data: any) => {
  const accessToken = await ensureValidToken();
  
  if (!accessToken) {
    throw new Error('No valid token. Please login first.');
  }

  // 📤 LOG REQUEST
  console.group(`📤 API REQUEST: ${endpoint}`);
  console.log('Endpoint:', endpoint);
  console.log('Data:', data);
  console.log('Timestamp:', new Date().toISOString());
  console.groupEnd();

  try {
    const { data: responseData, error } = await supabase.functions.invoke('tmwe-api-proxy', {
      body: {
        endpoint,
        data,
        bearerToken: accessToken
      }
    });

    // 📥 LOG RESPONSE
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
    // 🔥 LOG ERROR
    console.group(`🔥 API ERROR: ${endpoint}`);
    console.error('Error:', error);
    console.log('Endpoint:', endpoint);
    console.log('Data:', data);
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

  saveAccount: (data: {
    account_name: string;
    imap_host: string;
    imap_port: number;
    imap_encryption: string;
    smtp_host: string;
    smtp_port: number;
    smtp_encryption: string;
    email: string;
    password: string;
    default_account?: boolean;
  }) => fetchApi('/email_account', { handler: 'save_account', ...data }),

  deleteAccount: () => fetchApi('/email_account', { handler: 'delete_account' }),
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
    // Convert string UID to integer for API
    const uidInt = parseInt(uid, 10);
    if (isNaN(uidInt)) {
      throw new Error(`Invalid UID: ${uid}`);
    }
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
    // Convert string UID to integer for API
    const uidInt = parseInt(data.uid, 10);
    if (isNaN(uidInt)) {
      throw new Error(`Invalid UID: ${data.uid}`);
    }
    
    // Send both body and body_html as the API expects
    const requestData: any = {
      handler: 'reply_message', 
      uid: uidInt,
      reply_all: data.reply_all || false,
    };
    
    // Add body fields based on type
    if (data.body_type === 'html') {
      requestData.body = data.body.replace(/<[^>]*>/g, ''); // Strip HTML for plain text
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
    // Convert string UID to integer for API
    const uidInt = parseInt(data.uid, 10);
    if (isNaN(uidInt)) {
      throw new Error(`Invalid UID: ${data.uid}`);
    }
    
    const requestData: any = {
      handler: 'forward_message',
      uid: uidInt,
      to: data.to,
      body: data.body,
      body_html: data.body_html || '',
      cc: data.cc || [],
      bcc: data.bcc || [],
      attachments: data.attachments || []
    };
    
    return fetchApi('/email_message', requestData);
  },

  deleteEmail: (uid: string) => {
    // Convert string UID to integer for API
    const uidInt = parseInt(uid, 10);
    if (isNaN(uidInt)) {
      throw new Error(`Invalid UID: ${uid}`);
    }
    return fetchApi('/email_message', { handler: 'delete_email', uid: uidInt });
  },

  moveToTrash: (uid: string) => {
    // Convert string UID to integer for API
    const uidInt = parseInt(uid, 10);
    if (isNaN(uidInt)) {
      throw new Error(`Invalid UID: ${uid}`);
    }
    return fetchApi('/email_message', { handler: 'move_to_trash', uid: uidInt });
  },

  deleteMessages: (uids: string[]) => {
    // Convert string UIDs to integers for API
    const uidInts = uids.map(uid => {
      const uidInt = parseInt(uid, 10);
      if (isNaN(uidInt)) {
        throw new Error(`Invalid UID: ${uid}`);
      }
      return uidInt;
    });
    return fetchApi('/email_message', { handler: 'delete_messages', uids: uidInts });
  },

  moveMessagesToTrash: (uids: string[]) => {
    // Convert string UIDs to integers for API
    const uidInts = uids.map(uid => {
      const uidInt = parseInt(uid, 10);
      if (isNaN(uidInt)) {
        throw new Error(`Invalid UID: ${uid}`);
      }
      return uidInt;
    });
    return fetchApi('/email_message', { handler: 'move_messages_to_trash', uids: uidInts });
  },

  moveMessages: (uids: string[], targetFolder: string) => {
    // Convert string UIDs to integers for API
    const uidInts = uids.map(uid => {
      const uidInt = parseInt(uid, 10);
      if (isNaN(uidInt)) {
        throw new Error(`Invalid UID: ${uid}`);
      }
      return uidInt;
    });
    return fetchApi('/email_message', { 
      handler: 'move_messages', 
      uids: uidInts, 
      target_folder: targetFolder 
    });
  },

  markMessages: (uids: string[], action: 'read' | 'unread' | 'flagged' | 'unflagged') => {
    // Convert string UIDs to integers for API
    const uidInts = uids.map(uid => {
      const uidInt = parseInt(uid, 10);
      if (isNaN(uidInt)) {
        throw new Error(`Invalid UID: ${uid}`);
      }
      return uidInt;
    });
    return fetchApi('/email_message', { 
      handler: 'mark_messages', 
      uids: uidInts, 
      action 
    });
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
