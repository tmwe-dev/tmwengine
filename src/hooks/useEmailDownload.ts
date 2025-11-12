/**
 * Unified Email Download Hook
 * Hook unificato per sostituire useSingleFast, useSingleFastPerformance, useSingleFastMax
 * Usa Strategy Pattern + Download Service per massima flessibilità
 */

import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EmailDownloadService } from '@/lib/email/services/EmailDownloadService';
import { CleanStrategy } from '@/lib/email/strategies/CleanStrategy';
import { LucaStrategy } from '@/lib/email/strategies/LucaStrategy';
import type { LogEntry, DownloadProgress } from '@/lib/email/strategies/DownloadStrategy';

export type DownloadStrategyType = 'clean' | 'luca';

interface UseEmailDownloadOptions {
  /** Tipo strategia download (default: 'luca') */
  strategy?: DownloadStrategyType;
  
  /** Max concurrent downloads (solo per parallel) */
  maxConcurrent?: number;
  
  /** Delay minimo tra downloads (solo per parallel) */
  minDelay?: number;
  
  /** Cartelle custom da scaricare (opzionale) */
  customFolders?: string[];
}

export function useEmailDownload(options: UseEmailDownloadOptions = { strategy: 'luca' }) {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<Array<LogEntry>>([]);
  const [progress, setProgress] = useState<DownloadProgress>({
    current_folder: '',
    imported: 0,
    total: 0,
    errors: 0
  });
  
  const serviceRef = useRef<EmailDownloadService | null>(null);

  /**
   * Aggiunge log entry con timestamp
   */
  const addLog = (entry: Omit<LogEntry, 'timestamp'>) => {
    setLogs(prev => [...prev, { ...entry, timestamp: new Date() }]);
  };

  /**
   * Recupera user email da Supabase
   */
  const getUserEmail = async (): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non autenticato');

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tmwe_email')
      .eq('user_id', user.id)
      .single();

    if (!profile?.tmwe_email) throw new Error('Email TMWE non configurata');
    return profile.tmwe_email;
  };

  /**
   * Crea strategia download basata su opzioni
   */
  const createStrategy = () => {
    const strategy = options.strategy || 'luca'; // Default = Luca
    
    switch (strategy) {
      case 'clean':
        return new CleanStrategy();
      
      case 'luca':
        return new LucaStrategy();
      
      default:
        throw new Error(`Unknown strategy: ${strategy}`);
    }
  };

  /**
   * Avvia download
   */
  const start = async () => {
    setIsRunning(true);
    setLogs([]);
    setProgress({
      current_folder: '',
      imported: 0,
      total: 0,
      errors: 0
    });

    try {
      // 1. Get user email
      const userEmail = await getUserEmail();

      // 2. Create strategy
      const strategy = createStrategy();
      addLog({ 
        phase: 'preparing', 
        message: `📦 Strategy selected: ${strategy.name}` 
      });
      addLog({
        phase: 'preparing',
        message: `📝 ${strategy.description}`
      });

      // 3. Create service
      serviceRef.current = new EmailDownloadService(strategy, userEmail);

      // 4. Start download
      await serviceRef.current.start(
        (prog) => setProgress(prog),
        (log) => addLog(log)
      );

    } catch (error: any) {
      addLog({ 
        phase: 'error', 
        message: `❌ Error: ${error.message}` 
      });
    } finally {
      setIsRunning(false);
    }
  };

  /**
   * Ferma download in corso
   */
  const stop = () => {
    serviceRef.current?.stop();
    addLog({ phase: 'error', message: '🛑 Stop requested by user' });
  };

  /**
   * Reset stato
   */
  const reset = () => {
    setLogs([]);
    setProgress({
      current_folder: '',
      imported: 0,
      total: 0,
      errors: 0
    });
  };

  return {
    isRunning,
    logs,
    progress,
    start,
    stop,
    reset
  };
}
