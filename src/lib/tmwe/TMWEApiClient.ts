/**
 * TMWEApiClient - API Facade
 * 
 * Unified interface for all TMWE API operations
 * Delegates to existing tmwe-api-proxy Edge Function
 * 
 * PROTECTED: Uses supabase/functions/tmwe-api-proxy (DO NOT MODIFY)
 */

import { supabase } from '@/integrations/supabase/client';
import { TMWEAuthManager } from './TMWEAuthManager';

export interface TMWEApiRequest {
  endpoint: string;
  data: Record<string, any>;
  timeout?: number;
}

export interface TMWEApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: string[];
}

export class TMWEApiClient {
  /**
   * Execute API request via tmwe-api-proxy Edge Function
   * Automatically injects bearer token from TMWEAuthManager
   */
  static async request<T = any>(
    endpoint: string,
    data: Record<string, any>,
    timeout: number = 30
  ): Promise<TMWEApiResponse<T>> {
    try {
      // Get valid token (auto-refresh if needed)
      const token = await TMWEAuthManager.getValidToken();

      // Call consolidated Edge Function
      const { data: responseData, error } = await supabase.functions.invoke('tmwe-api-proxy', {
        body: {
          endpoint,
          data: {
            ...data,
            bearerToken: token,
            timeout
          }
        }
      });

      if (error) {
        console.error('❌ [TMWEApiClient] Edge Function error:', error);
        return {
          success: false,
          error: error.message || 'API request failed'
        };
      }

      return {
        success: responseData?.success !== false,
        data: responseData,
        error: responseData?.error,
        errors: responseData?.errors
      };
    } catch (error: any) {
      console.error('🔥 [TMWEApiClient] Request failed:', error);
      
      // Handle authentication errors
      if (error.message === 'TMWE_AUTH_REQUIRED' || error.message === 'TMWE_REFRESH_FAILED') {
        return {
          success: false,
          error: 'Authentication required. Please sign in again.'
        };
      }

      return {
        success: false,
        error: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Execute request to /email_search endpoint (RabbitMQ + Elasticsearch)
   * Optimized for fast metadata queries
   */
  static async searchRequest<T = any>(
    handler: string,
    data: Record<string, any>
  ): Promise<TMWEApiResponse<T>> {
    return this.request<T>('/email_search', {
      handler,
      ...data
    });
  }

  /**
   * Execute request to /email_message endpoint (Direct IMAP)
   * Used for write operations and email body retrieval
   */
  static async messageRequest<T = any>(
    handler: string,
    data: Record<string, any>
  ): Promise<TMWEApiResponse<T>> {
    return this.request<T>('/email_message', {
      handler,
      ...data
    });
  }

  /**
   * Health check - verify API is accessible
   */
  static async healthCheck(): Promise<boolean> {
    try {
      const response = await this.searchRequest('get_folders', { 
        include_counts: false,
        timeout: 5 
      });
      return response.success;
    } catch {
      return false;
    }
  }
}
