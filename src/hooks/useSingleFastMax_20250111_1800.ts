/**
 * useSingleFastMax Hook
 * 
 * React hook for Single Fast MAX email import with "dance" approach
 * - Alternates between fetching UIDs and downloading emails
 * - Starts downloading in 3-4 seconds (vs 45 minutes)
 * - Progressive, resumable, memory efficient
 */

import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { processFolderWithDance, type DanceProgress } from "@/lib/single-fast-max-core";
import { getSingleFastFoldersFromLocal, populateTempIndexForFolder } from "@/lib/single-fast-core";
import { getSyncPreferences } from "@/lib/email-sync-preferences";

export interface LogEntry {
  timestamp: Date;
  phase: 'preparing' | 'importing' | 'completed' | 'error' | 'skip' | 'init' | 'warning' | 'stopped' | 'stopping';
  folder?: string;
  message: string;
  email_details?: string;
}

export interface MaxProgress {
  current_folder: string;
  current_batch: number;
  total_downloaded: number;
  current_email: string;
  folders_completed: number;
  total_folders: number;
}

export function useSingleFastMax() {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState<MaxProgress>({
    current_folder: '',
    current_batch: 0,
    total_downloaded: 0,
    current_email: '',
    folders_completed: 0,
    total_folders: 0,
  });

  const shouldStop = useRef(false);

  const addLog = (entry: Omit<LogEntry, 'timestamp'>) => {
    const log_entry: LogEntry = {
      timestamp: new Date(),
      ...entry,
    };
    
    setLogs(prev => [...prev, log_entry]);
    console.log(`[useSingleFastMax] ${log_entry.timestamp.toLocaleTimeString('it-IT')} - ${log_entry.message}`);
  };

  const getUserEmail = async (): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user?.email) {
      throw new Error('User not authenticated');
    }

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('tmwe_email')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !profile?.tmwe_email) {
      throw new Error('TMWE email not configured in user profile');
    }

    return profile.tmwe_email;
  };

  const startSingleFastMax = async () => {
    setIsRunning(true);
    setLogs([]);
    shouldStop.current = false;

    setProgress({
      current_folder: '',
      current_batch: 0,
      total_downloaded: 0,
      current_email: '',
      folders_completed: 0,
      total_folders: 0,
    });

    addLog({ 
      phase: 'init', 
      message: '🚀 Single Fast MAX avviato - Modalità DANZA attiva' 
    });

    try {
      // Get user email
      const user_email = await getUserEmail();
      addLog({ phase: 'init', message: `📧 User email: ${user_email}` });

      // Get folders to sync (FAST: usa solo email_temp_index, NO chiamate API)
      const folders = await getSingleFastFoldersFromLocal(user_email);
      let folders_to_sync = folders.filter(f => f.included);

      // ✅ NUOVO: Se nessuna cartella ha pending, popola prima email_temp_index
      if (folders_to_sync.length === 0 || folders_to_sync.every(f => f.pending === 0)) {
        const preferences = await getSyncPreferences(user_email);
        
        if (preferences.included_folders.length === 0) {
          addLog({ 
            phase: 'warning', 
            message: '⚠️ Configura prima le cartelle in Impostazioni → Sincronizzazione Email' 
          });
          return;
        }

        addLog({ 
          phase: 'preparing', 
          message: `📦 Popolamento email_temp_index per ${preferences.included_folders.length} cartelle...` 
        });

        // Popola temp index per ogni cartella selezionata
        for (const folder of preferences.included_folders) {
          if (shouldStop.current) break;

          addLog({ 
            phase: 'preparing',
            folder,
            message: `🔍 Scansione ${folder}...` 
          });

          await populateTempIndexForFolder(folder, user_email, {
            uid_batch_size: 100,
            page_throttle_ms: 2000,
            max_pages: undefined, // nessun limite
          }, (progress) => {
            addLog({
              phase: 'preparing',
              folder,
              message: `📊 ${progress.current}/${progress.total} email processate`,
              email_details: progress.subject || undefined,
            });
          });
        }

        // Ri-carica folders dopo popolamento
        const refreshedFolders = await getSingleFastFoldersFromLocal(user_email);
        folders_to_sync = refreshedFolders.filter(f => f.included);
      }

      // Controllo finale
      if (folders_to_sync.length === 0) {
        addLog({ 
          phase: 'warning', 
          message: '⚠️ Nessuna cartella con email da sincronizzare' 
        });
        return;
      }

      setProgress(prev => ({
        ...prev,
        total_folders: folders_to_sync.length,
      }));

      addLog({ 
        phase: 'preparing', 
        message: `📂 Cartelle da sincronizzare: ${folders_to_sync.length}` 
      });

      folders_to_sync.forEach(f => {
        addLog({ 
          phase: 'preparing', 
          folder: f.folderName,
          message: `   - ${f.folderName}: ${f.pending} email pending` 
        });
      });

      // Process each folder with "dance"
      for (let i = 0; i < folders_to_sync.length; i++) {
        if (shouldStop.current) {
          addLog({ phase: 'stopped', message: '🛑 Processo interrotto dall\'utente' });
          break;
        }

        const folder = folders_to_sync[i];

        addLog({ 
          phase: 'preparing', 
          folder: folder.folderName,
          message: `🎯 Avvio DANZA per ${folder.folderName} (${i + 1}/${folders_to_sync.length})` 
        });

        setProgress(prev => ({
          ...prev,
          current_folder: folder.folderName,
          current_batch: 0,
          current_email: '',
        }));

        const result = await processFolderWithDance(
          user_email,
          folder.folderName,
          {},
          2,
          (folder_name: string, imported: number, total: number) => {
            setProgress(prev => ({
              ...prev,
              total_downloaded: imported,
              current_email: `Processing ${folder_name}...`,
            }));

            addLog({
              phase: 'importing',
              folder: folder_name,
              message: `📦 ${imported}/${total} downloaded`,
            });
          }
        );

        setProgress(prev => ({
          ...prev,
          folders_completed: prev.folders_completed + 1,
        }));

        addLog({ 
          phase: 'completed', 
          folder: folder.folderName,
          message: `✅ ${folder.folderName} completata: ${result.total_downloaded} scaricate, ${result.errors} errori` 
        });
      }

      addLog({ 
        phase: 'completed', 
        message: `🎉 Single Fast MAX completato! Totale: ${progress.total_downloaded} email scaricate` 
      });

    } catch (error: any) {
      addLog({ 
        phase: 'error', 
        message: `❌ Errore: ${error.message}` 
      });
      console.error('[useSingleFastMax] Error:', error);
    } finally {
      setIsRunning(false);
      shouldStop.current = false;
    }
  };

  const stopProcess = () => {
    shouldStop.current = true;
    addLog({ 
      phase: 'stopping', 
      message: '⏸️ Arresto in corso... (completerà il batch corrente)' 
    });
  };

  const reset = () => {
    setLogs([]);
    setProgress({
      current_folder: '',
      current_batch: 0,
      total_downloaded: 0,
      current_email: '',
      folders_completed: 0,
      total_folders: 0,
    });
    shouldStop.current = false;
  };

  return {
    isRunning,
    logs,
    progress,
    startSingleFastMax,
    stopProcess,
    reset,
  };
}
