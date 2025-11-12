/**
 * STEP 4: Cache locale per folder list
 * Riduce chiamate API ripetute per get_folders (da 11s a <100ms per hit)
 */

interface FolderCacheEntry {
  data: any;
  timestamp: number;
  config: {
    include_counts: boolean;
    include_hierarchy: boolean;
  };
}

class FolderCache {
  private cache: Map<string, FolderCacheEntry> = new Map();
  private ttl: number = 60000; // 1 minuto di default

  /**
   * Genera chiave cache basata su configurazione
   */
  private getCacheKey(config: { include_counts: boolean; include_hierarchy: boolean }): string {
    return `folders_${config.include_counts}_${config.include_hierarchy}`;
  }

  /**
   * Ottieni folder dalla cache (se valida)
   */
  get(config: { include_counts: boolean; include_hierarchy: boolean }): any | null {
    const key = this.getCacheKey(config);
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    const now = Date.now();
    const isValid = (now - entry.timestamp) < this.ttl;
    
    if (!isValid) {
      this.cache.delete(key);
      return null;
    }
    
    console.log(`✅ Folder Cache HIT (${key}) - Saved ~10s API call`);
    return entry.data;
  }

  /**
   * Salva folder in cache
   */
  set(data: any, config: { include_counts: boolean; include_hierarchy: boolean }): void {
    // ✅ VALIDAZIONE: Non salvare dati vuoti/invalidi
    if (!data || (Array.isArray(data) && data.length === 0)) {
      console.warn(`⚠️ [FolderCache] SKIP caching empty data for ${this.getCacheKey(config)}`);
      return;
    }
    
    const key = this.getCacheKey(config);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      config
    });
    console.log(`💾 [FolderCache] SET ${key}: ${Array.isArray(data) ? data.length : 'N/A'} folders`);
  }

  /**
   * Invalida cache (es. dopo create/delete folder)
   */
  invalidate(): void {
    this.cache.clear();
    console.log(`🗑️ Folder Cache INVALIDATED`);
  }

  /**
   * Imposta TTL custom (in millisecondi)
   */
  setTTL(ms: number): void {
    this.ttl = ms;
  }

  /**
   * Statistiche cache
   */
  getStats() {
    return {
      size: this.cache.size,
      ttl: this.ttl,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        age: Date.now() - entry.timestamp,
        config: entry.config
      }))
    };
  }
}

// Singleton instance
export const folderCache = new FolderCache();
