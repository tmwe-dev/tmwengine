/**
 * Unified Email Download Hook
 * Hook unificato per sostituire useSingleFast, useSingleFastPerformance, useSingleFastMax
 * Usa Strategy Pattern + Download Service per massima flessibilità
 */

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EmailDownloadService } from '@/lib/email/services/EmailDownloadService';
import { CleanStrategy } from '@/lib/email/strategies/CleanStrategy';
import { LucaStrategy } from '@/lib/email/strategies/LucaStrategy';
import { MasterStrategy } from '@/lib/email/strategies/MasterStrategy';
import type { LogEntry, DownloadProgress, StrategyConfig } from '@/lib/email/strategies/DownloadStrategy';

export type DownloadStrategyType = 'clean' | 'luca' | 'master';

interface UseEmailDownloadOptions {
  /** Tipo strategia download (default: 'luca') */
  strategy?: DownloadStrategyType;
  
  /** Sequenza automatica di strategie (es: ['luca', 'clean']) */
  sequenceStrategies?: DownloadStrategyType[];
  
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
  const [performanceConfig, setPerformanceConfig] = useState<StrategyConfig | null>(null);
  
  const serviceRef = useRef<EmailDownloadService | null>(null);

  /**
   * Carica configurazione performance all'avvio
   */
  useEffect(() => {
    const loadPerformanceConfig = async () => {
      try {
        const { getActiveProfile } = await import('@/lib/performance-profiles');
        const profile = await getActiveProfile();
        
        if (profile?.optimization_flags) {
          const config: StrategyConfig = {
            batch_size: profile.optimization_flags.batchChunkSize || 25,
            max_concurrent: profile.optimization_flags.useSequentialExecution ? 1 : 5,
            max_empty_batches: 3,
            min_delay_ms: 100
          };
          setPerformanceConfig(config);
          addLog({
            phase: 'preparing',
            message: `⚙️ Performance profile loaded: ${profile.profile_name} (batch: ${config.batch_size})`
          });
        } else {
          // Default config se nessun profilo attivo
          const defaultConfig: StrategyConfig = {
            batch_size: 25,
            max_concurrent: 1,
            max_empty_batches: 3,
            min_delay_ms: 100
          };
          setPerformanceConfig(defaultConfig);
          addLog({
            phase: 'preparing',
            message: `⚙️ Using default performance config (batch: ${defaultConfig.batch_size})`
          });
        }
      } catch (error: any) {
        console.error('Error loading performance config:', error);
        // Fallback a default config
        const defaultConfig: StrategyConfig = {
          batch_size: 25,
          max_concurrent: 1,
          max_empty_batches: 3,
          min_delay_ms: 100
        };
        setPerformanceConfig(defaultConfig);
      }
    };
    
    loadPerformanceConfig();
  }, []);

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
   * Crea strategia download basata su tipo
   */
  const createStrategyByType = (strategyType: DownloadStrategyType) => {
    if (!performanceConfig) {
      throw new Error('Performance config not loaded yet');
    }

    switch (strategyType) {
      case 'clean':
        return new CleanStrategy(performanceConfig);
      
      case 'luca':
        return new LucaStrategy(performanceConfig);
      
      case 'master':
        return new MasterStrategy(performanceConfig);
      
      default:
        throw new Error(`Unknown strategy: ${strategyType}`);
    }
  };

  /**
   * Crea strategia download basata su opzioni e performance config
   */
  const createStrategy = () => {
    const strategy = options.strategy || 'luca'; // Default = Luca
    return createStrategyByType(strategy);
  };

  /**
   * Avvia download
   * @param customFolders - Cartelle custom da scaricare (override automatico da DB)
   */
  const start = async (customFolders?: string[]) => {
    if (!performanceConfig) {
      addLog({ phase: 'error', message: '⚠️ Waiting for performance config...' });
      return;
    }

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

      // 2. Check if sequence mode
      if (options.sequenceStrategies && options.sequenceStrategies.length > 0) {
        // SEQUENZA AUTOMATICA - Esegui strategie in ordine
        addLog({ 
          phase: 'preparing', 
          message: `🔄 Sequenza: ${options.sequenceStrategies.map(s => s.toUpperCase()).join(' → ')}` 
        });

        for (const strategyType of options.sequenceStrategies) {
          const strategy = createStrategyByType(strategyType);
          
          addLog({ 
            phase: 'preparing', 
            message: `\n🚀 FASE: ${strategy.name}` 
          });
          addLog({
            phase: 'preparing',
            message: `📝 ${strategy.description}`
          });

          // Create service
          serviceRef.current = new EmailDownloadService(
            strategy, 
            userEmail, 
            customFolders || options.customFolders
          );

          // Execute strategy
          await serviceRef.current.start(
            (prog) => setProgress(prog),
            (log) => addLog(log)
          );

          addLog({ 
            phase: 'completed', 
            message: `✅ Fase ${strategy.name} completata` 
          });
        }

        addLog({ 
          phase: 'completed', 
          message: `\n🎉 Sequenza completata!` 
        });

      } else {
        // STRATEGIA SINGOLA - Logica esistente
        const strategy = createStrategy();
        addLog({ 
          phase: 'preparing', 
          message: `📦 Strategy: ${strategy.name}` 
        });
        addLog({
          phase: 'preparing',
          message: `📝 ${strategy.description}`
        });

        // 3. Create service (passa customFolders al constructor)
        serviceRef.current = new EmailDownloadService(
          strategy, 
          userEmail, 
          customFolders || options.customFolders
        );

        // 4. Start download (service carica preferenze se customFolders non fornito)
        await serviceRef.current.start(
          (prog) => setProgress(prog),
          (log) => addLog(log)
        );
      }

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
