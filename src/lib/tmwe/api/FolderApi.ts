/**
 * FolderApi - Folder Operations Wrapper
 * 
 * Wraps existing folder operations from emailSearchApi
 * Provides consistent interface using TMWEApiClient
 * 
 * PROTECTED: Delegates to src/lib/tmwe-email-search-api.ts
 */

import { emailSearchApi } from '@/lib/tmwe-email-search-api';

export class FolderApi {
  /**
   * Get folders with counts and hierarchy
   */
  static async getFolders(params?: {
    include_counts?: boolean;
    hierarchy?: boolean;
    timeout?: number;
  }) {
    return emailSearchApi.getFolders(params);
  }

  /**
   * Get folder information
   */
  static async getFolderInfo(folder_name: string, timeout = 10) {
    return emailSearchApi.getFolderInfo(folder_name, timeout);
  }

  /**
   * Get folder tree structure
   */
  static async getFolderTree(timeout = 10) {
    return emailSearchApi.getFolderTree(timeout);
  }

  /**
   * Get folder statistics
   * Returns: { total, unread, flagged, with_attachments }
   */
  static async getStatistics(params?: {
    folder?: string;
    timeout?: number;
  }) {
    return emailSearchApi.getStatistics(params);
  }

  /**
   * Get unread count for a folder
   */
  static async getUnreadCount(folder: string = 'INBOX'): Promise<number> {
    try {
      const stats = await this.getStatistics({ folder, timeout: 5 });
      return stats?.data?.unread || 0;
    } catch (error) {
      console.error('❌ [FolderApi] Failed to get unread count:', error);
      return 0;
    }
  }

  /**
   * Get total email count for a folder
   */
  static async getTotalCount(folder: string = 'INBOX'): Promise<number> {
    try {
      const stats = await this.getStatistics({ folder, timeout: 5 });
      return stats?.data?.total || 0;
    } catch (error) {
      console.error('❌ [FolderApi] Failed to get total count:', error);
      return 0;
    }
  }
}
