import type { ScanConfig, ScanResult } from '@/types/design-lab-scanner';
import { RealDesignLabScanner } from './real-scanner';

/**
 * DESIGN LAB SCANNER - WRAPPER
 * Wrapper per il nuovo scanner AST reale
 * Mantiene compatibilità con interfaccia esistente
 */
export class DesignLabScanner {
  private realScanner: RealDesignLabScanner;

  constructor(config: ScanConfig) {
    this.realScanner = new RealDesignLabScanner(config);
  }

  /**
   * Main scanning method - delegates to RealDesignLabScanner
   */
  async scanAllPages(): Promise<ScanResult> {
    return await this.realScanner.scanAllPages();
  }

  /**
   * Setup progress callback
   */
  onProgress(callback: (progress: number, task: string) => void): void {
    this.realScanner.onProgress(callback);
  }
}
