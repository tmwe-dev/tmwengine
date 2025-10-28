// TMWE Email Search RPC API Client
// Uses RabbitMQ + Elasticsearch for ~10x faster email operations
import { supabase } from "@/integrations/supabase/client";

// Reuse fetchApi from tmwe-api-integrated
const fetchApi = async (endpoint: string, data: any) => {
  console.log('🚀 Email Search API Request:', { 
    endpoint, 
    handler: data.handler,
    params: Object.keys(data).filter(k => k !== 'handler')
  });
  
  const startTime = performance.now();
  
  try {
    const { data: responseData, error } = await supabase.functions.invoke('tmwe-api-proxy', {
      body: { 
        endpoint, 
        data,
        optimizationFlags: {
          enableLogging: true,  // ✅ Activar logging en edge function
          useDoubleSerializat: false,
          useSequentialExecution: false,
          useTextResponse: false,
          useBatchParallelization: true,
          batchChunkSize: 10,
        }
      },
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
      success: responseData?.success,
      dataKeys: responseData?.data ? Object.keys(responseData.data) : 'no data object',
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
   * Fast metadata-only query (MySQL, no body)
   * ~10x faster than get_messages
   * Ideal for email lists
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
    page: params.page || 1,
    limit: params.limit || 50,
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
   * Complete email with body (Elasticsearch)
   * Use for email detail view
   */
  getEmailDetail: (params: {
    email_id: number;
    include_body?: boolean;
    timeout?: number;
  }) => fetchApi('/email_search', {
    handler: 'get_email_detail',
    email_id: params.email_id,
    include_body: params.include_body !== false,
    timeout: params.timeout || 10
  }),

  /**
   * Get folders (fast RPC)
   */
  getFolders: (timeout = 10) => 
    fetchApi('/email_search', { handler: 'get_folders', timeout }),

  /**
   * Get folder information
   */
  getFolderInfo: (folder_name: string, timeout = 10) =>
    fetchApi('/email_search', { handler: 'get_folder_info', folder_name, timeout }),

  /**
   * Get folder tree structure
   */
  getFolderTree: (timeout = 10) =>
    fetchApi('/email_search', { handler: 'get_folder_tree', timeout })
};
