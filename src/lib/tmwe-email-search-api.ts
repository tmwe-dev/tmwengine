// TMWE Email Search RPC API Client
// Uses RabbitMQ + Elasticsearch for ~10x faster email operations
import { supabase } from "@/integrations/supabase/client";

// Dedicated fetchApi for email_search endpoint
const fetchApi = async (endpoint: string, data: any) => {
  console.log('📤 Email Search API Request:', {
    handler: data.handler,
    folder: data.folder,
    page: data.page,
    limit: data.limit,
    params: Object.keys(data).filter(k => k !== 'handler'),
    timestamp: new Date().toISOString()
  });
  
  const startTime = performance.now();
  
  try {
    const { data: responseData, error } = await supabase.functions.invoke('tmwe-email-search-proxy', {
      body: data,
    });

    const duration = performance.now() - startTime;

    if (error) {
      console.error('❌ Email Search API Error:', { 
        handler: data.handler,
        error,
        duration: `${duration.toFixed(2)}ms`
      });
      throw error;
    }

    console.log('✅ Email Search API Response:', {
      handler: data.handler,
      requestedFolder: data.folder,
      success: responseData?.success,
      hasEmails: !!responseData?.emails,
      hasMessages: !!responseData?.messages,
      hasData: !!responseData?.data,
      emailsCount: responseData?.emails?.length,
      firstEmailFolder: responseData?.emails?.[0]?.folder,
      allKeys: responseData ? Object.keys(responseData) : [],
      duration: `${duration.toFixed(2)}ms`
    });
    
    return responseData;
  } catch (error: any) {
    const duration = performance.now() - startTime;
    console.error('🔥 Email Search API Communication Error:', { 
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
  }) => fetchApi('/email_search', {
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
  }) => fetchApi('/email_search', {
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
   */
  getEmailDetail: (params: {
    uid: number;
    folder: string;
    include_body?: boolean;
    timeout?: number;
  }) => fetchApi('/email_message', {
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
  }) => fetchApi('/email_search', { 
    handler: 'get_folders',
    include_counts: params?.include_counts !== false,  // Default true
    hierarchy: params?.hierarchy !== false,            // Default true
    timeout: params?.timeout || 10
  }),

  /**
   * Get folder information
   */
  getFolderInfo: (folder_name: string, timeout = 10) =>
    fetchApi('/email_search', { handler: 'get_folder_info', folder_name, timeout }),

  /**
   * Get folder tree structure
   */
  getFolderTree: (timeout = 10) =>
    fetchApi('/email_search', { handler: 'get_folder_tree', timeout }),

  /**
   * Mark email as read (write operation via RPC)
   */
  markAsRead: (email_id: number, timeout = 10) =>
    fetchApi('/email_message', { 
      handler: 'mark_messages', 
      uids: [email_id.toString()],
      action: 'read',
      timeout 
    }),

  /**
   * Mark email as unread (write operation via RPC)
   */
  markAsUnread: (email_id: number, timeout = 10) =>
    fetchApi('/email_message', { 
      handler: 'mark_messages', 
      uids: [email_id.toString()],
      action: 'unread',
      timeout 
    }),

  /**
   * Star/flag email (write operation via RPC)
   */
  starEmail: (email_id: number, timeout = 10) =>
    fetchApi('/email_message', { 
      handler: 'mark_messages', 
      uids: [email_id.toString()],
      action: 'flagged',
      timeout 
    }),

  /**
   * Delete email (move to trash via RPC)
   */
  deleteEmail: (email_id: number, timeout = 10) =>
    fetchApi('/email_message', { 
      handler: 'move_to_trash', 
      uids: [email_id.toString()],
      timeout 
    }),

  /**
   * Move email to folder (write operation via RPC)
   */
  moveEmail: (email_id: number, target_folder: string, timeout = 10) =>
    fetchApi('/email_message', { 
      handler: 'move_messages', 
      uids: [email_id.toString()],
      target_folder,
      timeout 
    }),

  /**
   * Bulk delete emails (move to trash via RPC)
   */
  deleteEmailsBulk: (email_ids: string[], timeout = 10) =>
    fetchApi('/email_message', { 
      handler: 'move_to_trash', 
      uids: email_ids,
      timeout 
    }),

  /**
   * Bulk mark emails as read (write operation via RPC)
   */
  markAsReadBulk: (email_ids: string[], timeout = 10) =>
    fetchApi('/email_message', { 
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
    const response = await fetchApi('/email_search', { 
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
  }) => fetchApi('/email_search', {
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
  }) => fetchApi('/email_search', {
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
  }) => fetchApi('/email_search', {
    handler: 'search_by_sender',
    sender: params.sender,
    folder: params.folder || 'INBOX',
    page: params.page || 1,
    limit: params.limit || 50,
    timeout: params.timeout || 10
  })
};
