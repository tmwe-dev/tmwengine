/**
 * ClassificationApi - Email Classification Operations
 * 
 * Uses NEW tmwe_classifications table (optimized for TMWE API)
 * Replaces legacy email_ai_classifications
 * 
 * Key improvements:
 * - tmwe_email_id as PRIMARY KEY (no UUID overhead)
 * - subject_preview for fast list rendering
 * - No dependency on local message_id
 */

import { supabase } from '@/integrations/supabase/client';
import { isFeatureEnabled } from '../config';

export interface TMWEClassification {
  tmwe_email_id: number;
  user_email: string;
  sender_email: string;
  subject: string;
  subject_preview?: string;
  
  // Classification
  group_id?: string;
  group_name: string;
  group_type: string;
  confidence?: number;
  reasoning?: string;
  
  // Metadata
  ai_model: string;
  classified_at?: string;
  is_manual_override?: boolean;
  status?: 'active' | 'archived' | 'deleted';
  
  created_at?: string;
  updated_at?: string;
}

export interface CreateClassificationParams {
  tmwe_email_id: number;
  user_email: string;
  sender_email: string;
  subject: string;
  group_name: string;
  group_type: string;
  ai_model: string;
  confidence?: number;
  reasoning?: string;
  group_id?: string;
}

export class ClassificationApi {
  private static readonly TABLE = 'tmwe_classifications';

  /**
   * Check if new table is enabled
   */
  private static isEnabled(): boolean {
    return isFeatureEnabled('USE_TMWE_CLASSIFICATIONS');
  }

  /**
   * Create a new classification
   */
  static async create(params: CreateClassificationParams): Promise<TMWEClassification | null> {
    if (!this.isEnabled()) {
      console.warn('⚠️ [ClassificationApi] New table disabled, skipping create');
      return null;
    }

    try {
      // Generate subject preview (first 50 chars)
      const subject_preview = params.subject.length > 50 
        ? params.subject.substring(0, 50) + '...'
        : params.subject;

      const { data, error } = await supabase
        .from(this.TABLE)
        .insert({
          tmwe_email_id: params.tmwe_email_id,
          user_email: params.user_email,
          sender_email: params.sender_email,
          subject: params.subject,
          subject_preview,
          group_id: params.group_id || null,
          group_name: params.group_name,
          group_type: params.group_type,
          confidence: params.confidence || null,
          reasoning: params.reasoning || null,
          ai_model: params.ai_model,
          classified_at: new Date().toISOString(),
          is_manual_override: false,
          status: 'active'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ [ClassificationApi] Create failed:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('🔥 [ClassificationApi] Create error:', error);
      return null;
    }
  }

  /**
   * Get classification by tmwe_email_id
   */
  static async getByEmailId(tmwe_email_id: number, user_email: string): Promise<TMWEClassification | null> {
    if (!this.isEnabled()) return null;

    try {
      const { data, error } = await supabase
        .from(this.TABLE)
        .select('*')
        .eq('tmwe_email_id', tmwe_email_id)
        .eq('user_email', user_email)
        .eq('status', 'active')
        .maybeSingle();

      if (error) {
        console.error('❌ [ClassificationApi] Get failed:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('🔥 [ClassificationApi] Get error:', error);
      return null;
    }
  }

  /**
   * Get all classifications for a user
   */
  static async getByUser(user_email: string, limit = 100): Promise<TMWEClassification[]> {
    if (!this.isEnabled()) return [];

    try {
      const { data, error } = await supabase
        .from(this.TABLE)
        .select('*')
        .eq('user_email', user_email)
        .eq('status', 'active')
        .order('classified_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ [ClassificationApi] Get by user failed:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('🔥 [ClassificationApi] Get by user error:', error);
      return [];
    }
  }

  /**
   * Get classifications by sender
   */
  static async getBySender(user_email: string, sender_email: string): Promise<TMWEClassification[]> {
    if (!this.isEnabled()) return [];

    try {
      const { data, error } = await supabase
        .from(this.TABLE)
        .select('*')
        .eq('user_email', user_email)
        .eq('sender_email', sender_email)
        .eq('status', 'active')
        .order('classified_at', { ascending: false });

      if (error) {
        console.error('❌ [ClassificationApi] Get by sender failed:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('🔥 [ClassificationApi] Get by sender error:', error);
      return [];
    }
  }

  /**
   * Update classification (manual override)
   */
  static async update(
    tmwe_email_id: number,
    user_email: string,
    updates: Partial<Pick<TMWEClassification, 'group_id' | 'group_name' | 'group_type' | 'is_manual_override'>>
  ): Promise<boolean> {
    if (!this.isEnabled()) return false;

    try {
      const { error } = await supabase
        .from(this.TABLE)
        .update({
          ...updates,
          is_manual_override: true,
          updated_at: new Date().toISOString()
        })
        .eq('tmwe_email_id', tmwe_email_id)
        .eq('user_email', user_email);

      if (error) {
        console.error('❌ [ClassificationApi] Update failed:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('🔥 [ClassificationApi] Update error:', error);
      return false;
    }
  }

  /**
   * Archive classification (soft delete)
   */
  static async archive(tmwe_email_id: number, user_email: string): Promise<boolean> {
    if (!this.isEnabled()) return false;

    try {
      const { error } = await supabase
        .from(this.TABLE)
        .update({
          status: 'archived',
          updated_at: new Date().toISOString()
        })
        .eq('tmwe_email_id', tmwe_email_id)
        .eq('user_email', user_email);

      if (error) {
        console.error('❌ [ClassificationApi] Archive failed:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('🔥 [ClassificationApi] Archive error:', error);
      return false;
    }
  }

  /**
   * Delete classification (hard delete)
   */
  static async delete(tmwe_email_id: number, user_email: string): Promise<boolean> {
    if (!this.isEnabled()) return false;

    try {
      const { error } = await supabase
        .from(this.TABLE)
        .delete()
        .eq('tmwe_email_id', tmwe_email_id)
        .eq('user_email', user_email);

      if (error) {
        console.error('❌ [ClassificationApi] Delete failed:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('🔥 [ClassificationApi] Delete error:', error);
      return false;
    }
  }

  /**
   * Get classification statistics
   */
  static async getStats(user_email: string): Promise<{
    total: number;
    by_group: Record<string, number>;
    by_model: Record<string, number>;
    manual_overrides: number;
  }> {
    if (!this.isEnabled()) {
      return {
        total: 0,
        by_group: {},
        by_model: {},
        manual_overrides: 0
      };
    }

    try {
      const { data, error } = await supabase
        .from(this.TABLE)
        .select('group_name, ai_model, is_manual_override')
        .eq('user_email', user_email)
        .eq('status', 'active');

      if (error || !data) {
        return {
          total: 0,
          by_group: {},
          by_model: {},
          manual_overrides: 0
        };
      }

      const by_group: Record<string, number> = {};
      const by_model: Record<string, number> = {};
      let manual_overrides = 0;

      data.forEach(item => {
        by_group[item.group_name] = (by_group[item.group_name] || 0) + 1;
        by_model[item.ai_model] = (by_model[item.ai_model] || 0) + 1;
        if (item.is_manual_override) manual_overrides++;
      });

      return {
        total: data.length,
        by_group,
        by_model,
        manual_overrides
      };
    } catch (error) {
      console.error('🔥 [ClassificationApi] Get stats error:', error);
      return {
        total: 0,
        by_group: {},
        by_model: {},
        manual_overrides: 0
      };
    }
  }
}
