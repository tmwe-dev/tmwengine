// TMWE Email Search RPC API Client
// Uses RabbitMQ + Elasticsearch for ~10x faster email operations
import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// HYBRID ARCHITECTURE: Two separate fetch functions for different operations
// ============================================================================

// 🔍 READ OPERATIONS: Fast metadata queries via RabbitMQ + Elasticsearch
// ✅ ENHANCED: Exponential backoff retry for transient failures
const fetchEmailSearchApi = async (data: any, retryCount = 0): Promise<any> => {
  const MAX_RETRIES = 3;
  const BACKOFF_BASE = 1000; // 1 segundo base
  
  const requestBody = {
    endpoint: '/email_search',
    data: data
  };
  
  // Generate curl command for debugging
  const curlCommand = `curl -X POST 'https://dlldkrzoxvjxpgkkttxu.supabase.co/functions/v1/tmwe-api-proxy' \\
  -H 'Content-Type: application/json' \\
  -H 'apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbGRrcnpveHZqeHBna2t0dHh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MjA1ODQsImV4cCI6MjA3NDI5NjU4NH0.PrHXldlTqbNm63S90_Wo4bFcFeSBMVeSxjJpUxoKf5A' \\
  -H 'authorization: Bearer YOUR_TOKEN_HERE' \\
  -d '${JSON.stringify(requestBody)}'`;
  
  console.log('📤 [EMAIL SEARCH] API Request:', {
    handler: data.handler,
    folder: data.folder,
    page: data.page,
    limit: data.limit,
    timestamp: new Date().toISOString(),
    attempt: retryCount + 1
  });
  
  if (retryCount === 0) {
    console.log('🔧 [CURL] Comando equivalente:\n', curlCommand);
  }
  
  const startTime = performance.now();
  
  try {
    // ✅ Usar tmwe-api-proxy (general proxy que funciona)
    const { data: responseData, error } = await supabase.functions.invoke('tmwe-api-proxy', {
      body: requestBody
    });

    const duration = performance.now() - startTime;

    if (error) {
      console.error('❌ [EMAIL SEARCH] Error:', { 
        handler: data.handler,
        error,
        duration: `${duration.toFixed(2)}ms`,
        attempt: retryCount + 1
      });
      throw error;
    }

    console.log('✅ [EMAIL SEARCH] Response:', {
      handler: data.handler,
      success: responseData?.success,
      emailsCount: responseData?.emails?.length,
      duration: `${duration.toFixed(2)}ms`,
      attempt: retryCount + 1
    });
    
    return responseData;
  } catch (error: any) {
    const duration = performance.now() - startTime;
    
    // ✅ Retry logic with exponential backoff
    const isRetryableError = error.status !== 404 && error.status !== 401 && error.status !== 403;
    
    if (retryCount < MAX_RETRIES && isRetryableError) {
      const delay = BACKOFF_BASE * Math.pow(2, retryCount);
      console.warn(`⚠️ [EMAIL SEARCH] Retry ${retryCount + 1}/${MAX_RETRIES} after ${delay}ms...`, {
        handler: data.handler,
        error: error.message,
        duration: `${duration.toFixed(2)}ms`
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchEmailSearchApi(data, retryCount + 1);
    }
    
    console.error('🔥 [EMAIL SEARCH] Max retries reached or non-retryable error:', { 
      handler: data.handler,
      error: error.message,
      duration: `${duration.toFixed(2)}ms`,
      attempts: retryCount + 1
    });
    throw error;
  }
};

// ✍️ WRITE OPERATIONS + EMAIL DETAIL: Direct IMAP via legacy proxy
const fetchEmailMessageApi = async (data: any) => {
  console.log('📤 [EMAIL MESSAGE] API Request:', {
    handler: data.handler,
    folder: data.folder,
    uid: data.uid,
    timestamp: new Date().toISOString()
  });
  
  const startTime = performance.now();
  
  try {
    const { data: responseData, error } = await supabase.functions.invoke('tmwe-api-proxy', {
      body: {
        endpoint: '/email_message',
        data: data
      }
    });

    const duration = performance.now() - startTime;

    if (error) {
      console.error('❌ [EMAIL MESSAGE] Error:', { 
        handler: data.handler,
        error,
        duration: `${duration.toFixed(2)}ms`
      });
      throw error;
    }

    console.log('✅ [EMAIL MESSAGE] Response:', {
      handler: data.handler,
      success: responseData?.success,
      duration: `${duration.toFixed(2)}ms`
    });
    
    return responseData;
  } catch (error: any) {
    const duration = performance.now() - startTime;
    console.error('🔥 [EMAIL MESSAGE] Communication Error:', { 
      handler: data.handler,
      error: error.message,
      duration: `${duration.toFixed(2)}ms`
    });
    throw error;
  }
};

export const emailSearchApi = {
  /**
   * Fast metadata-only query (uses email_search RPC API)
   * Returns email list with metadata from Elasticsearch
   * Ideal for email lists - NO IMAP connection needed
   */
  getEmailsMetadata: (params: {
    folder?: string;
    page?: number;
    limit?: number;
    is_seen?: boolean;
    is_flagged?: boolean;
    has_attachments?: boolean;
    date_from?: string;
    date_to?: string;
    timeout?: number;
  }) => fetchEmailSearchApi({
    handler: 'get_emails_metadata',
    folder: params.folder || 'INBOX',
    limit: params.limit || 50,
    page: params.page || 1,
    timeout: params.timeout || 10,
    ...(params.is_seen !== undefined && { is_seen: params.is_seen }),
    ...(params.is_flagged !== undefined && { is_flagged: params.is_flagged }),
    ...(params.has_attachments !== undefined && { has_attachments: params.has_attachments }),
    ...(params.date_from && { date_from: params.date_from }),
    ...(params.date_to && { date_to: params.date_to })
  }),

  /**
   * Full-text search with Elasticsearch
   * Advanced search capabilities
   */
  searchEmails: (params: {
    query: string;
    page?: number;
    limit?: number;
    date_from?: string;
    date_to?: string;
    search_folder?: string;
    has_attachments?: boolean;
    timeout?: number;
  }) => fetchEmailSearchApi({
    handler: 'search_emails',
    query: params.query,
    page: params.page || 1,
    limit: params.limit || 20,
    timeout: params.timeout || 15,
    ...(params.date_from && { date_from: params.date_from }),
    ...(params.date_to && { date_to: params.date_to }),
    ...(params.search_folder && { search_folder: params.search_folder }),
    ...(params.has_attachments !== undefined && { has_attachments: params.has_attachments })
  }),

  /**
   * Complete email with body (get single message)
   * Use for email detail view
   * Uses /email_message endpoint (direct IMAP) for full email content
   */
  getEmailDetail: (params: {
    uid: number;
    folder: string;
    include_body?: boolean;
    timeout?: number;
  }) => fetchEmailMessageApi({
    handler: 'get_message',
    uid: params.uid,
    folder: params.folder,
    include_body: params.include_body !== false,
    timeout: params.timeout || 10
  }),

  /**
   * Get folders with optional hierarchy and counts (fast RPC)
   */
  getFolders: (params?: {
    include_counts?: boolean;
    hierarchy?: boolean;
    timeout?: number;
  }) => fetchEmailSearchApi({ 
    handler: 'get_folders',
    include_counts: params?.include_counts !== false,
    hierarchy: params?.hierarchy !== false,
    timeout: params?.timeout || 10
  }),

  /**
   * Get folder information
   */
  getFolderInfo: (folder_name: string, timeout = 10) =>
    fetchEmailSearchApi({ handler: 'get_folder_info', folder_name, timeout }),

  /**
   * Get folder tree structure
   */
  getFolderTree: (timeout = 10) =>
    fetchEmailSearchApi({ handler: 'get_folder_tree', timeout }),

  /**
   * Mark email as read (write operation via RPC)
   */
  markAsRead: (email_id: number, timeout = 10) =>
    fetchEmailMessageApi({ 
      handler: 'mark_messages', 
      uids: [email_id.toString()],
      action: 'read',
      timeout 
    }),

  /**
   * Mark email as unread (write operation via RPC)
   */
  markAsUnread: (email_id: number, timeout = 10) =>
    fetchEmailMessageApi({ 
      handler: 'mark_messages', 
      uids: [email_id.toString()],
      action: 'unread',
      timeout 
    }),

  /**
   * Star/flag email (write operation via RPC)
   */
  starEmail: (email_id: number, timeout = 10) =>
    fetchEmailMessageApi({ 
      handler: 'mark_messages', 
      uids: [email_id.toString()],
      action: 'flagged',
      timeout 
    }),

  /**
   * Delete email (move to trash via RPC)
   */
  deleteEmail: (email_id: number, timeout = 10) =>
    fetchEmailMessageApi({ 
      handler: 'move_to_trash', 
      uids: [email_id.toString()],
      timeout 
    }),

  /**
   * Move email to folder (write operation via RPC)
   */
  moveEmail: (email_id: number, target_folder: string, timeout = 10) =>
    fetchEmailMessageApi({ 
      handler: 'move_messages', 
      uids: [email_id.toString()],
      target_folder,
      timeout 
    }),

  /**
   * Bulk delete emails (move to trash via RPC)
   */
  deleteEmailsBulk: (email_ids: string[], timeout = 10) =>
    fetchEmailMessageApi({ 
      handler: 'move_to_trash', 
      uids: email_ids,
      timeout 
    }),

  /**
   * Bulk mark emails as read (write operation via RPC)
   */
  markAsReadBulk: (email_ids: string[], timeout = 10) =>
    fetchEmailMessageApi({ 
      handler: 'mark_messages', 
      uids: email_ids,
      action: 'read',
      timeout 
    }),

  /**
   * Get statistics for folder or account (ultra-fast)
   * Uses getFolderInfo to get folder statistics
   * Returns: { data: { total, unread, flagged, with_attachments } }
   */
  getStatistics: async (params?: {
    folder?: string;
    timeout?: number;
  }) => {
    const folderName = params?.folder || 'INBOX';
    const response = await fetchEmailSearchApi({ 
      handler: 'get_folder_info', 
      folder_name: folderName, 
      timeout: params?.timeout || 10 
    });
    
    // Transform folder_info response to stats format
    const folderInfo = response?.folder || response?.folder_info || response;
    return {
      success: true,
      data: {
        folder: folderName,
        total: folderInfo?.total_messages || folderInfo?.messages || 0,
        unread: folderInfo?.unseen || folderInfo?.unread_count || 0,
        flagged: folderInfo?.flagged || 0,
        with_attachments: folderInfo?.with_attachments || 0
      }
    };
  },

  /**
   * Get unread count for all folders (ultra-fast for badges)
   * Returns: { INBOX: 23, Sent: 0, ... }
   */
  getUnreadCount: (params?: {
    folders?: string[];
    timeout?: number;
  }) => fetchEmailSearchApi({
    handler: 'get_unread_count',
    ...(params?.folders && { folders: params.folders }),
    timeout: params?.timeout || 5
  }),

  /**
   * Get conversation threads
   * Returns grouped messages by thread
   */
  getThreads: (params: {
    folder?: string;
    message_id?: string;
    limit?: number;
    timeout?: number;
  }) => fetchEmailSearchApi({
    handler: 'get_threads',
    ...(params.folder && { folder: params.folder }),
    ...(params.message_id && { message_id: params.message_id }),
    limit: params.limit || 20,
    timeout: params.timeout || 10
  }),

  /**
   * Search by sender (faster than fulltext)
   */
  searchBySender: (params: {
    sender: string;
    folder?: string;
    page?: number;
    limit?: number;
    timeout?: number;
  }) => fetchEmailSearchApi({
    handler: 'search_by_sender',
    sender: params.sender,
    folder: params.folder || 'INBOX',
    page: params.page || 1,
    limit: params.limit || 50,
    timeout: params.timeout || 10
  })
};
