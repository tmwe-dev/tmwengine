/**
 * In-Memory Cache per API Configuration
 * Riduce query DB da 2 per chiamata API → 2 ogni 5 minuti
 * 
 * Benefici:
 * - Elimina bottleneck database locks
 * - Velocità 100x su chiamate successive
 * - Riduce load su Supabase connection pool
 */

import type { ApiConfig } from '@/lib/tmwe-api-integrated';

interface CacheEntry {
  config: ApiConfig;
  timestamp: number;
  userEmail: string;
}

class ApiConfigCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly TTL_MS = 5 * 60 * 1000; // 5 minuti

  /**
   * Recupera config dalla cache se valida
   */
  get(userEmail: string): ApiConfig | null {
    const cached = this.cache.get(userEmail);
    
    if (!cached) {
      console.log('🔍 [ApiConfigCache] Cache miss:', userEmail);
      return null;
    }

    const age = Date.now() - cached.timestamp;
    const isExpired = age > this.TTL_MS;

    if (isExpired) {
      console.log(`⏰ [ApiConfigCache] Cache expired (age: ${Math.round(age / 1000)}s)`, userEmail);
      this.cache.delete(userEmail);
      return null;
    }

    console.log(`✅ [ApiConfigCache] Cache hit (age: ${Math.round(age / 1000)}s)`, userEmail);
    return cached.config;
  }

  /**
   * Salva config in cache
   */
  set(userEmail: string, config: ApiConfig): void {
    this.cache.set(userEmail, {
      config,
      timestamp: Date.now(),
      userEmail
    });
    console.log('💾 [ApiConfigCache] Config cached for', userEmail);
  }

  /**
   * Invalida cache per un utente (dopo update credentials)
   */
  invalidate(userEmail: string): void {
    const deleted = this.cache.delete(userEmail);
    if (deleted) {
      console.log('🧹 [ApiConfigCache] Cache invalidated for', userEmail);
    }
  }

  /**
   * Invalida tutta la cache (per debugging)
   */
  invalidateAll(): void {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`🧹 [ApiConfigCache] All cache cleared (${size} entries)`);
  }

  /**
   * Statistiche cache (per monitoring)
   */
  getStats() {
    return {
      entries: this.cache.size,
      ttl_seconds: this.TTL_MS / 1000,
      cached_users: Array.from(this.cache.keys())
    };
  }
}

// Singleton instance
export const apiConfigCache = new ApiConfigCache();
