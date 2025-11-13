/**
 * Strategy Pattern per Download Email
 * Interface base per implementazioni diverse (Sequential, Parallel, Dance)
 */

export interface StrategyConfig {
  batch_size: number;
  max_concurrent?: number;
  max_empty_batches?: number;
  min_delay_ms?: number;
}

export interface DownloadProgress {
  current_folder: string;
  current_batch?: number;
  imported: number;
  total: number;
  errors: number;
  current_email?: string;
}

export interface FolderToSync {
  folderName: string;
  pending: number;
  included: boolean;
  startUID?: number; // Custom start UID for smart download
}

export interface LogEntry {
  timestamp: Date;
  phase: 'preparing' | 'importing' | 'completed' | 'error' | 'skip' | 'warning';
  folder?: string;
  message: string;
  count?: { current: number; total: number };
  email?: string;
}

export interface DownloadResult {
  total_downloaded: number;
  total_errors: number;
  folders_completed: number;
}

/**
 * Interface base per strategie di download
 */
export interface DownloadStrategy {
  /** Nome strategia */
  name: string;
  
  /** Descrizione funzionalità */
  description: string;
  
  /**
   * Esegue download secondo strategia specifica
   * @param folders - Cartelle da sincronizzare
   * @param userEmail - Email utente TMWE
   * @param onProgress - Callback per aggiornamenti progress
   * @param onLog - Callback per logging
   * @param shouldStop - Function per check se fermare processo
   * @returns Risultato download
   */
  execute(
    folders: FolderToSync[],
    userEmail: string,
    onProgress: (progress: DownloadProgress) => void,
    onLog: (log: Omit<LogEntry, 'timestamp'>) => void,
    shouldStop: () => boolean
  ): Promise<DownloadResult>;
}
