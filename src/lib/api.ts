import { fetchApi } from './tmwe-api-integrated';

/**
 * Clean API wrapper for TMWE Email System
 * Uses Edge Function proxy (tmwe-api-proxy) for secure token management
 * Compatible with the functional email system architecture
 */

// ==========================================
// EMAIL API
// ==========================================
export const emailApi = {
  /**
   * Get emails with pagination and optional search
   */
  getEmails: async (folder: string, page: number = 1, limit: number = 50, search?: string) => {
    const handler = search ? 'search_messages' : 'get_messages';
    return fetchApi('/email_message', {
      handler,
      folder,
      page,
      limit,
      ...(search && { query: search })
    });
  },

  /**
   * Get single email detail
   */
  getEmailDetail: async (messageId: string) => {
    return fetchApi('/email_message', {
      handler: 'get_message',
      message_id: messageId
    });
  },

  /**
   * Send email
   */
  sendEmail: async (to: string, subject: string, body: string, attachments?: any[]) => {
    return fetchApi('/email_message', {
      handler: 'send_message',
      to,
      subject,
      body,
      attachments
    });
  },

  /**
   * Delete email
   */
  deleteEmail: async (messageId: string) => {
    return fetchApi('/email_message', {
      handler: 'delete_message',
      message_id: messageId
    });
  },

  /**
   * Delete multiple emails
   */
  deleteMessages: async (messageIds: string[]) => {
    return fetchApi('/email_message', {
      handler: 'delete_messages',
      message_ids: messageIds
    });
  },

  /**
   * Mark email as read/unread
   */
  markEmail: async (messageId: string, flag: string, value: boolean) => {
    return fetchApi('/email_message', {
      handler: 'mark_message',
      message_id: messageId,
      flag,
      value
    });
  },

  /**
   * Move email to folder
   */
  moveEmail: async (messageId: string, targetFolder: string) => {
    return fetchApi('/email_message', {
      handler: 'move_message',
      message_id: messageId,
      target_folder: targetFolder
    });
  },

  /**
   * Reply to email
   */
  replyEmail: async (messageId: string, body: string, replyAll: boolean = false) => {
    return fetchApi('/email_message', {
      handler: replyAll ? 'reply_all_message' : 'reply_message',
      message_id: messageId,
      body
    });
  },

  /**
   * Forward email
   */
  forwardEmail: async (messageId: string, to: string, body?: string) => {
    return fetchApi('/email_message', {
      handler: 'forward_message',
      message_id: messageId,
      to,
      body
    });
  },

  /**
   * Get folders
   */
  getFolders: async () => {
    return fetchApi('/email_folder', {
      handler: 'get_folders'
    });
  }
};

// ==========================================
// FOLDER API
// ==========================================
export const emailFolderApi = {
  /**
   * Get all folders
   */
  getFolders: async () => {
    return fetchApi('/email_folder', {
      handler: 'get_folders'
    });
  },

  /**
   * Create new folder
   */
  createFolder: async (name: string, parent?: string) => {
    return fetchApi('/email_folder', {
      handler: 'create_folder',
      name,
      ...(parent && { parent })
    });
  },

  /**
   * Delete folder
   */
  deleteFolder: async (name: string) => {
    return fetchApi('/email_folder', {
      handler: 'delete_folder',
      name
    });
  },

  /**
   * Rename folder
   */
  renameFolder: async (oldName: string, newName: string) => {
    return fetchApi('/email_folder', {
      handler: 'rename_folder',
      old_name: oldName,
      new_name: newName
    });
  }
};

// ==========================================
// SYNC API
// ==========================================
export const emailSyncApi = {
  /**
   * Start full sync
   */
  startFullSync: async () => {
    return fetchApi('/email_sync', {
      handler: 'full_sync'
    });
  },

  /**
   * Start incremental sync
   */
  startIncrementalSync: async () => {
    return fetchApi('/email_sync', {
      handler: 'incremental_sync'
    });
  },

  /**
   * Sync specific folder
   */
  syncFolder: async (folder: string) => {
    return fetchApi('/email_sync', {
      handler: 'sync_folder',
      folder
    });
  },

  /**
   * Get sync status
   */
  getSyncStatus: async () => {
    return fetchApi('/email_sync', {
      handler: 'get_status'
    });
  },

  /**
   * Cancel sync
   */
  cancelSync: async () => {
    return fetchApi('/email_sync', {
      handler: 'cancel_sync'
    });
  }
};

// ==========================================
// ACCOUNT API
// ==========================================
export const emailAccountApi = {
  /**
   * Test connection
   */
  testConnection: async () => {
    return fetchApi('/email_account', {
      handler: 'test_connection'
    });
  },

  /**
   * Get account info
   */
  getAccountInfo: async () => {
    return fetchApi('/email_account', {
      handler: 'get_info'
    });
  }
};

// ==========================================
// CONFIG API (Compatibility Layer)
// ==========================================

/**
 * Get API config - compatibility function
 * In this system, tokens are managed server-side
 */
export const getApiConfig = () => {
  return {
    isConfigured: true,
    email: null // Token managed server-side
  };
};

/**
 * Set API config - compatibility function (no-op)
 */
export const setApiConfig = (config: any) => {
  console.log('setApiConfig called (token managed server-side)');
};

/**
 * Clear API config - logout functionality
 */
export const clearApiConfig = () => {
  console.log('clearApiConfig called - implement logout if needed');
};
