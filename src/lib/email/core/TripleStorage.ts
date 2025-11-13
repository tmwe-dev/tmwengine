/**
 * Triple-Redundant Storage per crash recovery
 * Memory → localStorage → sessionStorage
 * 
 * Garantisce persistenza dati anche in caso di:
 * - Browser crash
 * - Tab chiusa accidentalmente
 * - Out of memory
 * - Storage quota exceeded
 */

export class TripleStorage {
  private memory = new Map<string, any>();
  private localStorageAvailable = false;
  private sessionStorageAvailable = false;

  constructor() {
    this.localStorageAvailable = this.testStorage('localStorage');
    this.sessionStorageAvailable = this.testStorage('sessionStorage');
  }

  private testStorage(type: 'localStorage' | 'sessionStorage'): boolean {
    try {
      const storage = window[type];
      const test = '__storage_test__';
      storage.setItem(test, test);
      storage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get con fallback chain: Memory → localStorage → sessionStorage
   */
  get<T>(key: string): T | null {
    try {
      // 1. Memory (fastest)
      if (this.memory.has(key)) {
        return this.memory.get(key);
      }

      // 2. localStorage (persistent)
      if (this.localStorageAvailable) {
        const data = localStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          this.memory.set(key, parsed);
          return parsed;
        }
      }

      // 3. sessionStorage (session)
      if (this.sessionStorageAvailable) {
        const data = sessionStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          this.memory.set(key, parsed);
          return parsed;
        }
      }

      return null;
    } catch (e) {
      console.error('[TripleStorage] Get error:', e);
      return null;
    }
  }

  /**
   * Set su tutte e 3 le fonti (best effort)
   */
  set<T>(key: string, value: T): boolean {
    try {
      // 1. Always save to memory
      this.memory.set(key, value);

      const serialized = JSON.stringify(value);

      // 2. Try localStorage
      if (this.localStorageAvailable) {
        try {
          localStorage.setItem(key, serialized);
        } catch (e) {
          console.warn('[TripleStorage] localStorage full or blocked:', e);
          this.localStorageAvailable = false;
        }
      }

      // 3. Try sessionStorage as backup
      if (this.sessionStorageAvailable) {
        try {
          sessionStorage.setItem(key, serialized);
        } catch (e) {
          console.warn('[TripleStorage] sessionStorage full or blocked:', e);
          this.sessionStorageAvailable = false;
        }
      }

      return true;
    } catch (e) {
      console.error('[TripleStorage] Set error:', e);
      return false;
    }
  }

  /**
   * Remove da tutte e 3 le fonti
   */
  remove(key: string): void {
    try {
      this.memory.delete(key);
      if (this.localStorageAvailable) {
        localStorage.removeItem(key);
      }
      if (this.sessionStorageAvailable) {
        sessionStorage.removeItem(key);
      }
    } catch (e) {
      console.error('[TripleStorage] Remove error:', e);
    }
  }

  /**
   * Clear all storage
   */
  clear(): void {
    try {
      this.memory.clear();
      if (this.localStorageAvailable) {
        localStorage.clear();
      }
      if (this.sessionStorageAvailable) {
        sessionStorage.clear();
      }
    } catch (e) {
      console.error('[TripleStorage] Clear error:', e);
    }
  }
}
