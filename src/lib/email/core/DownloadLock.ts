import { TripleStorage } from './TripleStorage';

/**
 * Global Lock Mechanism per prevenire sync concorrenti
 * 
 * Usa TripleStorage per sincronizzare lock tra tab/finestre
 * Auto-expire dopo 5 minuti (stale lock protection)
 * 
 * Use cases:
 * - Previene download concorrenti tra tab
 * - Previene race conditions nel database
 * - Rileva e recupera lock stale (crash recovery)
 */

interface LockData {
  timestamp: number;
  id: string;
  user_email?: string;
}

export class DownloadLock {
  private lockKey = 'tmwe_email_download_lock';
  private storage: TripleStorage;
  private currentLockId: string | null = null;
  private readonly STALE_TIMEOUT = 300000; // 5 minuti

  constructor(storage?: TripleStorage) {
    this.storage = storage || new TripleStorage();
  }

  /**
   * Acquisisce lock globale
   * @returns true se lock acquisito, false se già in uso
   */
  acquire(userEmail?: string): boolean {
    try {
      const existing = this.storage.get<LockData>(this.lockKey);
      const now = Date.now();
      
      // Check stale lock
      if (existing) {
        const age = now - existing.timestamp;
        if (age < this.STALE_TIMEOUT) {
          console.warn('[DownloadLock] Lock already held by:', existing.id);
          return false;
        }
        console.warn('[DownloadLock] Stale lock detected (age:', Math.round(age / 1000), 's). Forcing release.');
      }
      
      // Acquire new lock
      this.currentLockId = `lock_${now}_${Math.random().toString(36).substr(2, 9)}`;
      this.storage.set(this.lockKey, {
        timestamp: now,
        id: this.currentLockId,
        user_email: userEmail
      });
      
      console.log('[DownloadLock] Lock acquired:', this.currentLockId);
      return true;
    } catch (e) {
      console.error('[DownloadLock] Acquire error:', e);
      return false;
    }
  }

  /**
   * Rilascia lock
   */
  release(): void {
    try {
      const existing = this.storage.get<LockData>(this.lockKey);
      
      // Verify ownership before release
      if (existing && existing.id === this.currentLockId) {
        this.storage.remove(this.lockKey);
        console.log('[DownloadLock] Lock released:', this.currentLockId);
        this.currentLockId = null;
      } else if (existing) {
        console.warn('[DownloadLock] Cannot release lock owned by:', existing.id);
      }
    } catch (e) {
      console.error('[DownloadLock] Release error:', e);
    }
  }

  /**
   * Controlla se lock è attivo
   */
  isLocked(): boolean {
    try {
      const existing = this.storage.get<LockData>(this.lockKey);
      if (!existing) return false;
      
      const age = Date.now() - existing.timestamp;
      return age < this.STALE_TIMEOUT;
    } catch (e) {
      console.error('[DownloadLock] Check error:', e);
      return false;
    }
  }

  /**
   * Force release (admin/debug only)
   */
  forceRelease(): void {
    try {
      this.storage.remove(this.lockKey);
      this.currentLockId = null;
      console.warn('[DownloadLock] Force release executed');
    } catch (e) {
      console.error('[DownloadLock] Force release error:', e);
    }
  }
}
