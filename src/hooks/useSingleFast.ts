/**
 * HOOK SINGLE FAST - Gestione stato e log real-time
 */

import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  populateTempIndexForFolder,
  importEmailFromTempIndex,
  getSingleFastFolders,
  fetchUIDsFromTempIndex
} from '@/lib/single-fast-core';

export interface LogEntry {
  timestamp: Date;
  phase: 'preparing' | 'importing' | 'completed' | 'error';
  folder?: string;
  message: string;
  count?: { current: number; total: number };
  emailDetails?: {
    from_name: string | null;
    from_email: string;
    subject: string | null;
    date: string;
  };
}

export interface TempIndexResult {
  folder: string;
  uids: number;
  status: 'completed' | 'error';
  errorMessage?: string;
}

export function useSingleFast() {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [tempResults, setTempResults] = useState<TempIndexResult[]>([]);
  const [pauseState, setPauseState] = useState(false);
  
  const shouldStop = useRef(false);
  const isPaused = useRef(false);

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

  const startSingleFast = async () => {
    setIsRunning(true);
    setLogs([]);
    setTempResults([]);
    shouldStop.current = false;
    isPaused.current = false;
    setPauseState(false);

    try {
      const userEmail = await getUserEmail();
      addLog({ phase: 'preparing', message: '🔍 Caricamento preferenze cartelle...' });

      // 1. Get folders from preferences
      const folders = await getSingleFastFolders(userEmail);
      const foldersToSync = folders.filter(f => f.included);
      
      addLog({ 
        phase: 'preparing', 
        message: `📁 Cartelle da sincronizzare: ${foldersToSync.length}` 
      });

      if (foldersToSync.length === 0) {
        addLog({ phase: 'completed', message: '⚠️ Nessuna cartella configurata per la sincronizzazione' });
        return;
      }

      // 2. Loop cartelle
      for (let i = 0; i < foldersToSync.length; i++) {
        // Check stop
        if (shouldStop.current) {
          addLog({ phase: 'error', message: '🛑 Processo interrotto dall\'utente' });
          break;
        }
        
        const folder = foldersToSync[i];
        
        addLog({
          phase: 'preparing',
          folder: folder.folderName,
          message: `🔍 [${i + 1}/${foldersToSync.length}] Preparazione ${folder.folderName}...`
        });

        try {
          // 3. Popola temp index CON CALLBACK PROGRESS
          const result = await populateTempIndexForFolder(
            folder.folderName,
            userEmail,
            (details) => {
              const formattedDate = new Date(details.date).toLocaleString('it-IT', {
                day: '2-digit',
                month: '2-digit', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
              
              addLog({
                phase: 'preparing',
                folder: folder.folderName,
                message: `📧 ${details.from_name || details.from_email}`,
                count: { current: details.current, total: details.total },
                emailDetails: {
                  from_name: details.from_name,
                  from_email: details.from_email,
                  subject: details.subject,
                  date: formattedDate
                }
              });
            }
          );

          addLog({
            phase: 'preparing',
            folder: folder.folderName,
            message: `✅ Preparate ${result.totalMissing} email da ${folder.folderName}`
          });

          // 4. Import da temp index
          const uids = await fetchUIDsFromTempIndex(folder.folderName, userEmail);

          addLog({
            phase: 'importing',
            folder: folder.folderName,
            message: `📥 Inizio import ${uids.length} email da ${folder.folderName}...`
          });

          let successCount = 0;
          let errorCount = 0;

          for (let j = 0; j < uids.length; j++) {
            // Check stop
            if (shouldStop.current) {
              addLog({ phase: 'error', message: '🛑 Import interrotto' });
              break;
            }
            
            // Check pause
            while (isPaused.current) {
              await new Promise(resolve => setTimeout(resolve, 500));
              if (shouldStop.current) break;
            }
            
            if (shouldStop.current) break;
            
            try {
              addLog({
                phase: 'importing',
                folder: folder.folderName,
                message: `📧 Import email ${j + 1}/${uids.length}`,
                count: { current: j + 1, total: uids.length }
              });

              await importEmailFromTempIndex(uids[j], folder.folderName, userEmail);
              successCount++;

              // Throttle per non sovraccaricare
              if (j % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, 100));
              }
            } catch (err: any) {
              console.error(`❌ Error importing UID ${uids[j]}:`, err);
              errorCount++;
              addLog({
                phase: 'error',
                folder: folder.folderName,
                message: `❌ Errore import UID ${uids[j]}: ${err.message}`
              });
            }
          }

          // Risultato finale cartella
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
            message: `✅ Completata ${folder.folderName}: ${successCount}/${uids.length} email importate${errorCount > 0 ? ` (${errorCount} errori)` : ''}`
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

      addLog({ phase: 'completed', message: '🎉 Single Fast completato!' });
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
    startSingleFast,
    reset,
    pauseProcess,
    resumeProcess,
    stopProcess
  };
}
