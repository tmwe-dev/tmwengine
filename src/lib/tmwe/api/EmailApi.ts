/**
 * EmailApi - Email Operations Wrapper
 * 
 * Wraps existing emailSearchApi from tmwe-email-search-api.ts
 * Provides consistent interface using TMWEApiClient
 * 
 * PROTECTED: Delegates to src/lib/tmwe-email-search-api.ts
 */

import { emailSearchApi } from '@/lib/tmwe-email-search-api';

export class EmailApi {
  /**
   * Get emails metadata (fast, no IMAP)
   * Uses Elasticsearch for rapid list rendering
   */
  static async getEmailsMetadata(params: {
    folder?: string;
    page?: number;
    limit?: number;
    is_seen?: boolean;
    is_flagged?: boolean;
    has_attachments?: boolean;
    date_from?: string;
    date_to?: string;
    timeout?: number;
  }) {
    return emailSearchApi.getEmailsMetadata(params);
  }

  /**
   * Search emails using full-text search
   * Powered by Elasticsearch
   */
  static async searchEmails(params: {
    query: string;
    page?: number;
    limit?: number;
    date_from?: string;
    date_to?: string;
    search_folder?: string;
    has_attachments?: boolean;
    timeout?: number;
  }) {
    return emailSearchApi.searchEmails(params);
  }

  /**
   * Get email detail by email_id (from Elasticsearch)
   * Fastest method - use when email_id is available
   */
  static async getEmailDetail(params: {
    email_id: number;
    include_body?: boolean;
    timeout?: number;
  }) {
    return emailSearchApi.getEmailDetail(params);
  }

  /**
   * Legacy: Get email by UID + folder (direct IMAP)
   * Slower - only use when email_id not available
   */
  static async getEmailDetailByUid(params: {
    uid: number;
    folder: string;
    include_body?: boolean;
    timeout?: number;
  }) {
    return emailSearchApi.getEmailDetailByUid(params);
  }

  /**
   * Mark email as read
   */
  static async markAsRead(email_id: number, timeout = 10) {
    return emailSearchApi.markAsRead(email_id, timeout);
  }

  /**
   * Mark email as unread
   */
  static async markAsUnread(email_id: number, timeout = 10) {
    return emailSearchApi.markAsUnread(email_id, timeout);
  }

  /**
   * Star/flag email
   */
  static async starEmail(email_id: number, timeout = 10) {
    return emailSearchApi.starEmail(email_id, timeout);
  }

  /**
   * Delete email (move to trash)
   */
  static async deleteEmail(email_id: number, timeout = 10) {
    return emailSearchApi.deleteEmail(email_id, timeout);
  }

  /**
   * Move email to folder
   */
  static async moveEmail(email_id: number, target_folder: string, timeout = 10) {
    return emailSearchApi.moveEmail(email_id, target_folder, timeout);
  }

  /**
   * Bulk operations
   */
  static async deleteEmailsBulk(email_ids: string[], timeout = 10) {
    return emailSearchApi.deleteEmailsBulk(email_ids, timeout);
  }

  static async markAsReadBulk(email_ids: string[], timeout = 10) {
    return emailSearchApi.markAsReadBulk(email_ids, timeout);
  }
}
