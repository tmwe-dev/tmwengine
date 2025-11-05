/**
 * Parallel Download Controller con Rate Limiting
 * Evita di sovraccaricare il server IMAP
 */

export class ParallelDownloadController {
  private activeDownloads = 0;
  private queue: Array<() => Promise<any>> = [];
  private maxConcurrent: number;
  private minDelay: number; // ms tra download
  private cancelled = false;
  
  constructor(maxConcurrent = 10, minDelay = 0) {
    this.maxConcurrent = maxConcurrent;
    this.minDelay = minDelay;
  }
  
  async download<T>(fn: () => Promise<T>): Promise<T> {
    // Se sotto il limite, esegui subito
    if (this.activeDownloads < this.maxConcurrent) {
      return this.executeDownload(fn);
    }
    
    // Altrimenti, metti in coda
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await this.executeDownload(fn);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });
  }
  
  private async executeDownload<T>(fn: () => Promise<T>): Promise<T> {
    if (this.cancelled) {
      throw new Error('Download cancelled');
    }
    
    this.activeDownloads++;
    
    try {
      const result = await fn();
      
      // Rate limiting delay
      if (!this.cancelled) {
        await new Promise(resolve => setTimeout(resolve, this.minDelay));
      }
      
      return result;
    } finally {
      this.activeDownloads--;
      
      // Processa prossimo in coda
      if (this.queue.length > 0 && !this.cancelled) {
        const next = this.queue.shift();
        if (next) next();
      }
    }
  }
  
  getStats() {
    return {
      active: this.activeDownloads,
      queued: this.queue.length,
      maxConcurrent: this.maxConcurrent
    };
  }
  
  /**
   * 🆕 V4: Aggiorna dinamicamente i limiti di concorrenza e delay
   * Utile per adattare il comportamento per folder diverse
   */
  updateLimits(maxConcurrent: number, minDelay: number) {
    this.maxConcurrent = maxConcurrent;
    this.minDelay = minDelay;
    console.log(`⚙️ [ParallelController] Updated limits: concurrent=${maxConcurrent}, delay=${minDelay}ms`);
  }
  
  /**
   * 🆕 V5: Cancella tutti i download in corso e svuota la coda
   */
  cancel() {
    this.cancelled = true;
    this.queue = [];
    console.log('🛑 [ParallelController] Download cancellati');
  }
}
