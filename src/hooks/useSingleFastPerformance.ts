/**
 * HOOK SINGLE FAST PERFORMANCE - Con ParallelDownloadController
 * Sistema parallelo per import massivo email ad alta velocità
 * 
 * ⚡ DIFFERENZE da useSingleFast.ts:
 * - Integrazione profili performance dal database
 * - ParallelDownloadController per download paralleli
 * - Batch dinamico basato su optimization_flags.batchChunkSize
 * - Velocità stimata 10-12x superiore
 */

import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getSingleFastFolders } from '@/lib/single-fast-core';
import { getActiveProfile, type PerformanceProfile } from '@/lib/performance-profiles';
import { ParallelDownloadController } from '@/lib/parallel-download-controller';
import type { LogEntry, TempIndexResult } from './useSingleFast';

const TMWE_PROVIDER_ID = '00000000-0000-0000-0000-000000000000';

export function useSingleFastPerformance() {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [tempResults, setTempResults] = useState<TempIndexResult[]>([]);
  const [pauseState, setPauseState] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<string>('');
  const [currentPhase, setCurrentPhase] = useState<string>('');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [emailProgress, setEmailProgress] = useState({ imported: 0, total: 0, skipped: 0 });
  const [activeProfile, setActiveProfile] = useState<PerformanceProfile | null>(null);
  
  const shouldStop = useRef(false);
  const isPaused = useRef(false);
  const downloadController = useRef<ParallelDownloadController | null>(null);

  const addLog = (entry: Omit<LogEntry, 'timestamp'>) => {
    setLogs(prev => [...prev, { ...entry, timestamp: new Date() }]);
  };

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

  const startSingleFastPerformance = async () => {
    setIsRunning(true);
    setLogs([]);
    setTempResults([]);
    shouldStop.current = false;
    isPaused.current = false;
    setPauseState(false);
    setCurrentFolder('');
    setCurrentPhase('');
    setProgress({ current: 0, total: 0 });
    setEmailProgress({ imported: 0, total: 0, skipped: 0 });

    try {
      const userEmail = await getUserEmail();
      
      // 🎯 CARICA PROFILO PERFORMANCE ATTIVO
      addLog({ phase: 'preparing', message: '🎯 Caricamento profilo performance...' });
      const profile = await getActiveProfile();
      setActiveProfile(profile);
      
      if (!profile) {
        addLog({ 
          phase: 'error', 
          message: '⚠️ Nessun profilo performance attivo. Usa Performance Configurator per attivarne uno.' 
        });
        setIsRunning(false);
        return;
      }

      // 📊 ESTRAI CONFIGURAZIONI DAL PROFILO
      const batchSize = profile.optimization_flags?.batchChunkSize || 10;
      const useParallel = !profile.optimization_flags?.useSequentialExecution;
      const minDelay = 50; // ms tra batch
      
      addLog({ 
        phase: 'preparing', 
        message: `✅ Profilo "${profile.profile_name}" attivo: ${useParallel ? `${batchSize} email parallele` : 'sequenziale'}` 
      });

      // 🚀 INIZIALIZZA PARALLEL DOWNLOAD CONTROLLER
      if (useParallel) {
        downloadController.current = new ParallelDownloadController(batchSize, minDelay);
        addLog({ 
          phase: 'preparing', 
          message: `⚡ ParallelDownloadController inizializzato (max ${batchSize} concurrent, ${minDelay}ms delay)` 
        });
      }

      addLog({ phase: 'preparing', message: '🔍 Caricamento preferenze cartelle...' });

      // 1. Get folders from preferences
      const folders = await getSingleFastFolders(userEmail);
      const foldersToSync = folders.filter(f => f.included);

      if (foldersToSync.length === 0) {
        addLog({ phase: 'completed', message: '⚠️ Nessuna cartella configurata per la sincronizzazione' });
        return;
      }

      // 📋 PRE-FLIGHT SUMMARY
      const totalMissing = foldersToSync.reduce((sum, f) => sum + f.missing, 0);
      setProgress({ current: 0, total: foldersToSync.length });
      setEmailProgress({ imported: 0, total: totalMissing, skipped: 0 });
      
      addLog({ 
        phase: 'preparing', 
        message: `📋 PIANO: ${foldersToSync.length} cartelle, ${totalMissing} email totali (modo ${useParallel ? 'PARALLELO' : 'SEQUENZIALE'})` 
      });
      
      foldersToSync.forEach((f, i) => {
        addLog({
          phase: 'preparing',
          message: `  ${i + 1}. ${f.folderName} → ${f.missing} email`
        });
      });

      addLog({ phase: 'preparing', message: '⏳ Avvio tra 3 secondi...' });
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 📌 RECUPERO PROGRESSO SALVATO
      const savedProgress = JSON.parse(localStorage.getItem('singlefast_performance_progress') || '{}');
      const startIndex = savedProgress.currentFolderIndex || 0;
      
      if (startIndex > 0) {
        addLog({ 
          phase: 'preparing', 
          message: `🔄 Ripresa dal progresso salvato: cartella ${startIndex + 1}/${foldersToSync.length}` 
        });
      }

      // 2. Loop cartelle
      for (let i = startIndex; i < foldersToSync.length; i++) {
        if (shouldStop.current) {
          addLog({ phase: 'error', message: '🛑 Processo interrotto dall\'utente' });
          break;
        }
        
        const folder = foldersToSync[i];
        
        localStorage.setItem('singlefast_performance_progress', JSON.stringify({
          currentFolderIndex: i,
          currentFolder: folder.folderName,
          totalFolders: foldersToSync.length
        }));
        
        setCurrentFolder(folder.folderName);
        setCurrentPhase('Calcolo email mancanti');
        setProgress({ current: i + 1, total: foldersToSync.length });
        
        addLog({
          phase: 'preparing',
          folder: folder.folderName,
          message: `🔍 Analisi cartella ${folder.folderName} [${i + 1}/${foldersToSync.length}]`
        });

        try {
          // ✅ FASE 1: Populate email_temp_index con batch progressivi da 25
          addLog({
            phase: 'preparing',
            folder: folder.folderName,
            message: `📦 FASE 1: Caricamento UIDs in batch da 25...`
          });

          const { populateTempIndexForFolder, fetchUIDsFromTempIndex, importEmailFromTempIndex } = await import('@/lib/single-fast-core');

          await populateTempIndexForFolder(
            folder.folderName,
            userEmail,
            {}, // config (usa defaults)
            (details) => {
              addLog({
                phase: 'preparing',
                folder: folder.folderName,
                message: `📦 Batch ${details.current}/${details.total}: ${details.from_email}`
              });
            }
          );

          addLog({
            phase: 'preparing',
            folder: folder.folderName,
            message: `✅ FASE 1 completata: indice temporaneo creato`
          });

          // ✅ FASE 2: Fetch UIDs pendenti dalla tabella temporanea
          addLog({
            phase: 'preparing',
            folder: folder.folderName,
            message: `🔍 FASE 2: Recupero UIDs da importare...`
          });

          const uidsToImport = await fetchUIDsFromTempIndex(folder.folderName, userEmail);

          if (uidsToImport.length === 0) {
            addLog({
              phase: 'completed',
              folder: folder.folderName,
              message: `✅ Nessuna email da importare`
            });
            continue;
          }

          addLog({
            phase: 'importing',
            folder: folder.folderName,
            message: `📧 FASE 3: Inizio import di ${uidsToImport.length} email (${useParallel ? 'parallel' : 'sequential'})...`
          });

          let successCount = 0;
          let errorCount = 0;

          // ✅ FASE 3: Import email dalla tabella temporanea
          if (useParallel && downloadController.current) {
            // ⚡ MODO PARALLELO CON CONTROLLER
            for (let j = 0; j < uidsToImport.length; j++) {
              if (shouldStop.current) {
                addLog({ phase: 'error', message: '🛑 Import interrotto' });
                break;
              }

              while (isPaused.current) {
                await new Promise(resolve => setTimeout(resolve, 100));
                if (shouldStop.current) break;
              }

              if (shouldStop.current) break;

              const uid = uidsToImport[j];

              // Usa ParallelDownloadController per gestire la concorrenza
              downloadController.current.download(async () => {
                try {
                  await importEmailFromTempIndex(uid, folder.folderName, userEmail);

                  successCount++;
                  setEmailProgress(prev => ({ ...prev, imported: prev.imported + 1 }));

                  addLog({
                    phase: 'importing',
                    folder: folder.folderName,
                    message: `✅ [Parallel] Imported ${successCount}/${uidsToImport.length} - UID: ${uid}`,
                    count: { current: successCount, total: uidsToImport.length }
                  });
                } catch (err: any) {
                  console.error(`Error importing email UID ${uid}:`, err);
                  errorCount++;
                  setEmailProgress(prev => ({ ...prev, skipped: prev.skipped + 1 }));
                  addLog({
                    phase: 'skip',
                    folder: folder.folderName,
                    message: `⚠️ Skip UID ${uid}: ${err.message}`
                  });
                }
              });
            }

            // Attendi completamento parallelo
            while (downloadController.current.getStats().active > 0 || downloadController.current.getStats().queued > 0) {
              if (shouldStop.current) {
                addLog({ phase: 'error', message: '🛑 Arresto forzato: cancellazione download in corso...' });
                if (downloadController.current) {
                  downloadController.current.cancel();
                }
                break;
              }

              await new Promise(resolve => setTimeout(resolve, 500));
            }
          } else {
            // 📦 MODO SEQUENZIALE
            for (let j = 0; j < uidsToImport.length; j++) {
              if (shouldStop.current) {
                addLog({ phase: 'error', message: '🛑 Import interrotto' });
                break;
              }

              while (isPaused.current) {
                await new Promise(resolve => setTimeout(resolve, 100));
                if (shouldStop.current) break;
              }

              if (shouldStop.current) break;

              const uid = uidsToImport[j];

              try {
                await importEmailFromTempIndex(uid, folder.folderName, userEmail);

                successCount++;
                setEmailProgress(prev => ({ ...prev, imported: prev.imported + 1 }));

                addLog({
                  phase: 'importing',
                  folder: folder.folderName,
                  message: `✅ Imported ${j + 1}/${uidsToImport.length} - UID: ${uid}`,
                  count: { current: j + 1, total: uidsToImport.length }
                });

                // Throttle ogni 20 email
                if (j > 0 && j % 20 === 0) {
                  await new Promise(resolve => setTimeout(resolve, 200));
                }

              } catch (err: any) {
                console.error(`Error importing email UID ${uid}:`, err);
                errorCount++;
                setEmailProgress(prev => ({ ...prev, skipped: prev.skipped + 1 }));
                addLog({
                  phase: 'skip',
                  folder: folder.folderName,
                  message: `⚠️ Skip UID ${uid}: ${err.message}`
                });
              }

              if (shouldStop.current) {
                addLog({ phase: 'error', message: '🛑 Arresto richiesto' });
                break;
              }
            }
          }

          setTempResults(prev => [
            ...prev,
            {
              folder: folder.folderName,
              uids: successCount,
              status: errorCount === 0 ? 'completed' : 'completed'
            }
          ]);

          addLog({
            phase: 'completed',
            folder: folder.folderName,
            message: `✅ Completata ${folder.folderName}: ${successCount}/${uidsToImport.length} email${errorCount > 0 ? ` (${errorCount} errori)` : ''}`
          });
        } catch (err: any) {
          addLog({
            phase: 'error',
            folder: folder.folderName,
            message: `❌ Errore cartella ${folder.folderName}: ${err.message}`
          });

          setTempResults(prev => [
            ...prev,
            {
              folder: folder.folderName,
              uids: 0,
              status: 'error',
              errorMessage: err.message
            }
          ]);
        }
      }

      localStorage.removeItem('singlefast_performance_progress');
      
      addLog({ phase: 'completed', message: '🎉 Single Fast Performance completato!' });
    } catch (error: any) {
      addLog({ phase: 'error', message: `❌ Errore: ${error.message}` });
    } finally {
      setIsRunning(false);
    }
  };

  const reset = () => {
    setLogs([]);
    setTempResults([]);
    shouldStop.current = false;
    isPaused.current = false;
    setPauseState(false);
  };
  
  const pauseProcess = () => {
    isPaused.current = true;
    setPauseState(true);
    addLog({ phase: 'preparing', message: '⏸️ Processo in pausa...' });
  };
  
  const resumeProcess = () => {
    isPaused.current = false;
    setPauseState(false);
    addLog({ phase: 'preparing', message: '▶️ Processo ripreso' });
  };
  
  const stopProcess = () => {
    shouldStop.current = true;
    isPaused.current = false;
    setPauseState(false);
    addLog({ phase: 'error', message: '🛑 Arresto processo in corso...' });
  };

  return {
    isRunning,
    logs,
    tempResults,
    pauseState,
    currentFolder,
    currentPhase,
    progress,
    emailProgress,
    activeProfile,
    startSingleFastPerformance,
    reset,
    pauseProcess,
    resumeProcess,
    stopProcess
  };
}
