/**
 * Parallel Download Controller con Rate Limiting
 * Evita di sovraccaricare il server IMAP
 */

export class ParallelDownloadController {
  private activeDownloads = 0;
  private queue: Array<() => Promise<any>> = [];
  private maxConcurrent: number;
  private minDelay: number; // ms tra download
  
  constructor(maxConcurrent = 5, minDelay = 100) {
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
    this.activeDownloads++;
    
    try {
      const result = await fn();
      
      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, this.minDelay));
      
      return result;
    } finally {
      this.activeDownloads--;
      
      // Processa prossimo in coda
      if (this.queue.length > 0) {
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
}
