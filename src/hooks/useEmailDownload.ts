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

export type DownloadStrategyType = 'clean' | 'luca' | 'master' | 'simple' | 'edge-sync';

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
      
      case 'edge-sync':
        const { EdgeSyncStrategy } = require('@/lib/email/strategies/EdgeSyncStrategy');
        return new EdgeSyncStrategy();
      
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

      // 🆕 EDGE-SYNC STRATEGY - Use EdgeFunctionSyncService directly
      if (options.strategy === 'edge-sync') {
        console.log('🔍 [HOOK DIAGNOSTIC] ===== EDGE SYNC STRATEGY BLOCK ENTERED =====');
        console.log('🔍 [HOOK DIAGNOSTIC] Strategy:', options.strategy);
        console.log('🔍 [HOOK DIAGNOSTIC] Custom folders received:', customFolders);
        console.log('🔍 [HOOK DIAGNOSTIC] Options custom folders:', options.customFolders);
        console.log('🔍 [HOOK DIAGNOSTIC] User email:', userEmail);
        console.log('🔍 [HOOK DIAGNOSTIC] isRunning state:', isRunning);

        addLog({ 
          phase: 'preparing', 
          message: `📦 Strategy: Edge Sync v2 (Secure Proxy)` 
        });
        addLog({
          phase: 'preparing',
          message: `📝 Sync via Edge Function with real-time progress streaming`
        });

        console.log('📦 [HOOK DIAGNOSTIC] Importing EdgeFunctionSyncService...');
        const { EdgeFunctionSyncService } = await import('@/lib/email/services/EdgeFunctionSyncService');
        console.log('✅ [HOOK DIAGNOSTIC] EdgeFunctionSyncService imported successfully');
        
        console.log('🏗️ [HOOK DIAGNOSTIC] Creating EdgeFunctionSyncService instance...');
        const service = new EdgeFunctionSyncService();
        console.log('✅ [HOOK DIAGNOSTIC] Service instance created:', service);
        
        const folders = customFolders || options.customFolders || ['INBOX', 'Sent'];
        
        console.log('📁 [HOOK DIAGNOSTIC] Folders prepared for sync:', folders);

        addLog({ 
          phase: 'preparing', 
          message: `📁 Folders to sync: ${folders.join(', ')}` 
        });

        // 🔧 FIX: Use local variable for shouldStop to avoid React state timing issues
        let stopRequested = false;
        serviceRef.current = {
          stop: () => {
            console.log('🛑 [HOOK DIAGNOSTIC] Stop requested by user');
            stopRequested = true;
            service.stop();
          }
        } as any;

        try {
          console.log('🚀 [HOOK DIAGNOSTIC] Calling service.sync()...');
          console.log('🔍 [HOOK DIAGNOSTIC] Sync params:', {
            foldersCount: folders.length,
            folders,
            userEmail,
            hasProgressCallback: typeof setProgress === 'function',
            hasLogCallback: typeof addLog === 'function',
            hasStopCallback: true,
            stopRequestedInitial: stopRequested
          });

          const result = await service.sync(
            folders,
            userEmail,
            (progress) => {
              console.log('📊 [HOOK DIAGNOSTIC] Progress update received:', progress);
              setProgress(progress);
            },
            (log) => {
              console.log('📝 [HOOK DIAGNOSTIC] Log received:', log);
              addLog(log);
            },
            () => {
              console.log('🔍 [HOOK DIAGNOSTIC] shouldStop() called, stopRequested:', stopRequested);
              return stopRequested;
            }
          );

          console.log('✅ [HOOK DIAGNOSTIC] service.sync() completed successfully:', result);

          addLog({ 
            phase: 'completed', 
            message: `🎉 Edge Sync completed! Downloaded: ${result.total_downloaded}, Errors: ${result.total_errors}, Folders: ${result.folders_completed}` 
          });

        } catch (error: any) {
          console.error('❌ [HOOK DIAGNOSTIC] service.sync() threw error:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
            fullError: error
          });

          addLog({ 
            phase: 'error', 
            message: `❌ Edge Sync failed: ${error.message}` 
          });
          
          throw error;
        } finally {
          console.log('🏁 [HOOK DIAGNOSTIC] Finally block - setting isRunning to false');
          setIsRunning(false);
        }
        
        console.log('🔍 [HOOK DIAGNOSTIC] ===== EDGE SYNC STRATEGY BLOCK COMPLETED =====');
        return;
      }

      // 🆕 SIMPLE STRATEGY - Usa simple-downloader.ts direttamente
      if (options.strategy === 'simple') {
        addLog({ 
          phase: 'preparing', 
          message: `📦 Strategy: Simple Downloader` 
        });
        addLog({
          phase: 'preparing',
          message: `📝 Lista metadata + download body (no temp_index, no SmartPrep)`
        });

        const { simpleDownloadMultipleFolders } = await import('@/lib/email/simple-downloader');
        
        const folders = customFolders || options.customFolders || ['INBOX', 'Sent'];
        
        addLog({ 
          phase: 'preparing', 
          message: `📁 Folders: ${folders.join(', ')}` 
        });

        let totalDownloaded = 0;
        let totalSkipped = 0;
        let totalErrors = 0;

        for (const folder of folders) {
          setProgress(prev => ({ ...prev, current_folder: folder }));

          const result = await simpleDownloadMultipleFolders(
            [folder],
            userEmail,
            {
              limit: 100,
              onProgress: (current, total) => {
                setProgress(prev => ({
                  ...prev,
                  imported: totalDownloaded + current,
                  total: totalDownloaded + total
                }));
              },
              onLog: (message) => {
                addLog({ phase: 'importing', folder, message });
              }
            }
          );

          totalDownloaded += result.downloaded;
          totalSkipped += result.skipped;
          totalErrors += result.errors;

          addLog({ 
            phase: 'completed', 
            folder,
            message: `✅ ${folder}: ${result.downloaded} downloaded, ${result.skipped} skipped, ${result.errors} errors`,
            count: { current: result.downloaded, total: result.total_checked }
          });
        }

        addLog({ 
          phase: 'completed', 
          message: `🎉 Simple Download completed! Total: ${totalDownloaded} downloaded, ${totalSkipped} skipped, ${totalErrors} errors` 
        });

        setIsRunning(false);
        return;
      }

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
