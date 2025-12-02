/**
 * SenderApi - Sender Profile Operations
 * 
 * Uses NEW tmwe_sender_profiles table (unified groups + mappings)
 * Replaces legacy email_sender_groups + email_sender_mappings
 * 
 * Key improvements:
 * - Single table for sender configuration
 * - Integrated statistics (denormalized for performance)
 * - No complex JOINs
 */

import { supabase } from '@/integrations/supabase/client';
import { isFeatureEnabled } from '../config';

export interface TMWESenderProfile {
  id: string;
  user_email: string;
  sender_email: string;
  sender_domain: string;
  
  // Group Configuration
  group_name: string;
  group_type: string;
  color?: string;
  icon?: string;
  
  // Statistics (denormalized)
  total_emails: number;
  unread_emails: number;
  last_email_at?: string;
  first_email_at?: string;
  
  // Settings
  is_active: boolean;
  auto_archive: boolean;
  notification_enabled: boolean;
  
  created_at?: string;
  updated_at?: string;
}

export interface CreateSenderProfileParams {
  user_email: string;
  sender_email: string;
  group_name: string;
  group_type: string;
  color?: string;
  icon?: string;
}

export class SenderApi {
  private static readonly TABLE = 'tmwe_sender_profiles';

  /**
   * Check if new table is enabled
   */
  private static isEnabled(): boolean {
    return isFeatureEnabled('USE_TMWE_SENDER_PROFILES');
  }

  /**
   * Extract domain from email
   */
  private static extractDomain(email: string): string {
    return email.split('@')[1] || email;
  }

  /**
   * Create a new sender profile
   */
  static async create(params: CreateSenderProfileParams): Promise<TMWESenderProfile | null> {
    if (!this.isEnabled()) {
      console.warn('⚠️ [SenderApi] New table disabled, skipping create');
      return null;
    }

    try {
      const sender_domain = this.extractDomain(params.sender_email);

      const { data, error } = await supabase
        .from(this.TABLE)
        .insert({
          user_email: params.user_email,
          sender_email: params.sender_email,
          sender_domain,
          group_name: params.group_name,
          group_type: params.group_type,
          color: params.color || null,
          icon: params.icon || null,
          total_emails: 0,
          unread_emails: 0,
          is_active: true,
          auto_archive: false,
          notification_enabled: true
        })
        .select()
        .single();

      if (error) {
        console.error('❌ [SenderApi] Create failed:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('🔥 [SenderApi] Create error:', error);
      return null;
    }
  }

  /**
   * Get profile by sender email
   */
  static async getBySender(user_email: string, sender_email: string): Promise<TMWESenderProfile | null> {
    if (!this.isEnabled()) return null;

    try {
      const { data, error } = await supabase
        .from(this.TABLE)
        .select('*')
        .eq('user_email', user_email)
        .eq('sender_email', sender_email)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('❌ [SenderApi] Get by sender failed:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('🔥 [SenderApi] Get by sender error:', error);
      return null;
    }
  }

  /**
   * Get all profiles for a user
   */
  static async getByUser(user_email: string): Promise<TMWESenderProfile[]> {
    if (!this.isEnabled()) return [];

    try {
      const { data, error } = await supabase
        .from(this.TABLE)
        .select('*')
        .eq('user_email', user_email)
        .eq('is_active', true)
        .order('total_emails', { ascending: false });

      if (error) {
        console.error('❌ [SenderApi] Get by user failed:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('🔥 [SenderApi] Get by user error:', error);
      return [];
    }
  }

  /**
   * Get profiles by group name
   */
  static async getByGroup(user_email: string, group_name: string): Promise<TMWESenderProfile[]> {
    if (!this.isEnabled()) return [];

    try {
      const { data, error } = await supabase
        .from(this.TABLE)
        .select('*')
        .eq('user_email', user_email)
        .eq('group_name', group_name)
        .eq('is_active', true)
        .order('sender_email');

      if (error) {
        console.error('❌ [SenderApi] Get by group failed:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('🔥 [SenderApi] Get by group error:', error);
      return [];
    }
  }

  /**
   * Update sender profile
   */
  static async update(
    id: string,
    updates: Partial<Pick<TMWESenderProfile, 'group_name' | 'group_type' | 'color' | 'icon' | 'auto_archive' | 'notification_enabled'>>
  ): Promise<boolean> {
    if (!this.isEnabled()) return false;

    try {
      const { error } = await supabase
        .from(this.TABLE)
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('❌ [SenderApi] Update failed:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('🔥 [SenderApi] Update error:', error);
      return false;
    }
  }

  /**
   * Increment email count for sender
   */
  static async incrementEmailCount(user_email: string, sender_email: string, is_unread = false): Promise<boolean> {
    if (!this.isEnabled()) return false;

    try {
      // Get current profile
      const profile = await this.getBySender(user_email, sender_email);
      
      if (!profile) {
        // Create profile if doesn't exist
        await this.create({
          user_email,
          sender_email,
          group_name: 'Uncategorized',
          group_type: 'general'
        });
      }

      // Increment counts
      const { error } = await supabase.rpc('increment_sender_stats', {
        p_user_email: user_email,
        p_sender_email: sender_email,
        p_is_unread: is_unread
      });

      if (error) {
        console.error('❌ [SenderApi] Increment count failed:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('🔥 [SenderApi] Increment count error:', error);
      return false;
    }
  }

  /**
   * Update last email timestamp
   */
  static async updateLastEmailTimestamp(user_email: string, sender_email: string): Promise<boolean> {
    if (!this.isEnabled()) return false;

    try {
      const { error } = await supabase
        .from(this.TABLE)
        .update({
          last_email_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_email', user_email)
        .eq('sender_email', sender_email);

      if (error) {
        console.error('❌ [SenderApi] Update timestamp failed:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('🔥 [SenderApi] Update timestamp error:', error);
      return false;
    }
  }

  /**
   * Deactivate sender profile (soft delete)
   */
  static async deactivate(id: string): Promise<boolean> {
    if (!this.isEnabled()) return false;

    try {
      const { error } = await supabase
        .from(this.TABLE)
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('❌ [SenderApi] Deactivate failed:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('🔥 [SenderApi] Deactivate error:', error);
      return false;
    }
  }

  /**
   * Delete sender profile (hard delete)
   */
  static async delete(id: string): Promise<boolean> {
    if (!this.isEnabled()) return false;

    try {
      const { error } = await supabase
        .from(this.TABLE)
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ [SenderApi] Delete failed:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('🔥 [SenderApi] Delete error:', error);
      return false;
    }
  }

  /**
   * Get grouped statistics
   */
  static async getGroupedStats(user_email: string): Promise<{
    by_group: Record<string, {
      count: number;
      total_emails: number;
      unread_emails: number;
    }>;
    by_domain: Record<string, number>;
    total_senders: number;
  }> {
    if (!this.isEnabled()) {
      return {
        by_group: {},
        by_domain: {},
        total_senders: 0
      };
    }

    try {
      const { data, error } = await supabase
        .from(this.TABLE)
        .select('group_name, sender_domain, total_emails, unread_emails')
        .eq('user_email', user_email)
        .eq('is_active', true);

      if (error || !data) {
        return {
          by_group: {},
          by_domain: {},
          total_senders: 0
        };
      }

      const by_group: Record<string, { count: number; total_emails: number; unread_emails: number }> = {};
      const by_domain: Record<string, number> = {};

      data.forEach(item => {
        // Group stats
        if (!by_group[item.group_name]) {
          by_group[item.group_name] = {
            count: 0,
            total_emails: 0,
            unread_emails: 0
          };
        }
        by_group[item.group_name].count++;
        by_group[item.group_name].total_emails += item.total_emails || 0;
        by_group[item.group_name].unread_emails += item.unread_emails || 0;

        // Domain stats
        by_domain[item.sender_domain] = (by_domain[item.sender_domain] || 0) + 1;
      });

      return {
        by_group,
        by_domain,
        total_senders: data.length
      };
    } catch (error) {
      console.error('🔥 [SenderApi] Get grouped stats error:', error);
      return {
        by_group: {},
        by_domain: {},
        total_senders: 0
      };
    }
  }
}
