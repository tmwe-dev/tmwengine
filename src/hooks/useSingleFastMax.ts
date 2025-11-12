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

  const waitForSession = async (): Promise<boolean> => {
    // Check if session is already initialized
    const { data: { session } } = await supabase.auth.getSession();
    if (session) return true;

    // Wait for session initialization (max 5 seconds)
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(false), 5000);
      
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
          clearTimeout(timeout);
          subscription.unsubscribe();
          resolve(true);
        }
      });
    });
  };

  const getUserEmail = async (): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    
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
      // ✅ Wait for session to be initialized
      addLog({ phase: 'init', message: '🔐 Verifica autenticazione...' });
      const hasSession = await waitForSession();
      
      if (!hasSession) {
        addLog({ 
          phase: 'error', 
          message: '❌ Sessione non valida. Ricarica la pagina e riprova.' 
        });
        return;
      }
      
      addLog({ phase: 'init', message: '✅ Autenticazione verificata' });

      // Get user email (session is now ready!)
      const user_email = await getUserEmail();
      addLog({ phase: 'init', message: `📧 User email: ${user_email}` });

      // ✅ CHECK: l'indice ha già dati?
      const existingFolders = await getSingleFastFoldersFromLocal(user_email);
      const foldersWithData = existingFolders.filter(f => f.pending > 0 || f.folderName);

      if (foldersWithData.length > 0) {
        // ✅ INDICE GIÀ POPOLATO: skippo pre-popolazione
        addLog({ 
          phase: 'preparing', 
          message: `✅ Indice già popolato (${foldersWithData.length} cartelle). Skippo pre-popolazione.` 
        });
      } else {
        // ⚠️ INDICE VUOTO: pre-popola con LIMITI
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
          message: `⚠️ Indice vuoto. Pre-popolamento LIMITATO (max 2 pagine/cartella)...` 
        });

        // Popola temp index per ogni cartella selezionata
        for (let i = 0; i < preferences.included_folders.length; i++) {
          if (shouldStop.current) break;

          const folder = preferences.included_folders[i];
          addLog({ 
            phase: 'preparing',
            folder,
            message: `📦 Pre-caricamento PARZIALE ${i + 1}/${preferences.included_folders.length}: ${folder}` 
          });

          try {
            await populateTempIndexForFolder(folder, user_email, {
              uid_batch_size: 50,
              page_throttle_ms: 5000,
              max_pages: 999, // ✅ Download completo folder (rimosso limite artificiale)
            }, (progress) => {
              addLog({
                phase: 'preparing',
                folder,
                message: `   Batch ${progress.current}/${progress.total}: ${progress.from_email}`,
                email_details: progress.subject || undefined,
              });
            });
          } catch (error: any) {
            console.error(`❌ Errore pre-caricamento ${folder}:`, error);
            addLog({
              phase: 'error',
              folder: folder,
              message: `⚠️ Pre-caricamento ${folder} fallito: ${error.message}`
            });
          }

          // ✅ 10s throttle tra cartelle
          if (i < preferences.included_folders.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 10000));
          }
        }

        addLog({ phase: 'preparing', message: '✅ Pre-popolazione LIMITATA completata' });
      }

      // Ri-carica folders dopo controllo/popolamento
      const folders = await getSingleFastFoldersFromLocal(user_email);
      const folders_to_sync = folders.filter(f => f.included && f.pending > 0);

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
          {}, // Usa configurazione di default
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
