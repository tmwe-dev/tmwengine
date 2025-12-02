/**
 * TMWEAuthManager - Authentication Wrapper
 * 
 * Delegates to existing OAuth infrastructure (ensureValidToken)
 * Provides consistent auth interface for all TMWE operations
 * 
 * PROTECTED: Uses src/lib/tmwe-api-integrated.ts (DO NOT MODIFY)
 */

import { 
  getApiConfigFromDB, 
  setApiConfigToDB, 
  clearApiConfigFromDB,
  authenticateWithJWT,
  refreshAccessToken
} from '@/lib/tmwe-api-integrated';
import type { ApiConfig } from '@/lib/tmwe-api-integrated';

export class TMWEAuthManager {
  /**
   * Get current API configuration (with cache)
   * Uses existing ApiConfigCache for optimal performance
   */
  static async getConfig(): Promise<ApiConfig | null> {
    return await getApiConfigFromDB();
  }

  /**
   * Save API configuration to database
   */
  static async setConfig(config: ApiConfig & { email: string }): Promise<void> {
    return await setApiConfigToDB(config);
  }

  /**
   * Clear API configuration
   */
  static async clearConfig(): Promise<void> {
    return await clearApiConfigFromDB();
  }

  /**
   * Authenticate using JWT (faster than OAuth)
   */
  static async authenticateJWT(): Promise<boolean> {
    return await authenticateWithJWT();
  }

  /**
   * Refresh access token (supports both OAuth2 and JWT)
   */
  static async refreshToken(): Promise<boolean> {
    return await refreshAccessToken();
  }

  /**
   * Check if user is authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    const config = await this.getConfig();
    if (!config?.accessToken) return false;

    // Check token expiration
    if (config.expiresAt) {
      const expiresAt = new Date(config.expiresAt).getTime();
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      
      // Token expired or expires in less than 5 minutes
      if (expiresAt < now + fiveMinutes) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get valid access token (auto-refresh if needed)
   * Throws if authentication fails
   */
  static async getValidToken(): Promise<string> {
    const config = await this.getConfig();
    if (!config) {
      throw new Error('TMWE_AUTH_REQUIRED');
    }

    // Check if token is expired or about to expire (5 minutes buffer)
    if (config.expiresAt && new Date(config.expiresAt).getTime() < Date.now() + 300000) {
      console.warn('⚠️ TMWE token expired, attempting refresh...');
      
      // JWT: re-authenticate (no refresh token)
      if (config.authType === 'jwt') {
        const refreshed = await this.authenticateJWT();
        if (!refreshed) {
          throw new Error('TMWE_REFRESH_FAILED');
        }
        const newConfig = await this.getConfig();
        if (!newConfig?.accessToken) {
          throw new Error('TMWE_REFRESH_FAILED');
        }
        return newConfig.accessToken;
      }
      
      // OAuth2: use refresh token
      const refreshed = await this.refreshToken();
      if (!refreshed) {
        throw new Error('TMWE_REFRESH_FAILED');
      }
      const newConfig = await this.getConfig();
      if (!newConfig?.accessToken) {
        throw new Error('TMWE_REFRESH_FAILED');
      }
      return newConfig.accessToken;
    }

    return config.accessToken;
  }
}
