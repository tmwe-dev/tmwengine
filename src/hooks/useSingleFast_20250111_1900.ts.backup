/**
 * HOOK SINGLE FAST - Gestione stato e log real-time
 */

import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getSingleFastFoldersFromLocal } from '@/lib/single-fast-core';
import { emailMessageApi } from '@/lib/tmwe-api-integrated';

// Costante per provider TMWE (ID dalla tabella email_provider)
const TMWE_PROVIDER_ID = '00000000-0000-0000-0000-000000000000';

export interface LogEntry {
  timestamp: Date;
  phase: 'preparing' | 'importing' | 'completed' | 'error' | 'skip' | 'init' | 'warning' | 'stopped' | 'stopping';
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
  const [currentFolder, setCurrentFolder] = useState<string>('');
  const [currentPhase, setCurrentPhase] = useState<string>('');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [emailProgress, setEmailProgress] = useState({ imported: 0, total: 0, skipped: 0 });
  
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
    setCurrentFolder('');
    setCurrentPhase('');
    setProgress({ current: 0, total: 0 });
    setEmailProgress({ imported: 0, total: 0, skipped: 0 });

    try {
      const userEmail = await getUserEmail();
      
      // 1. Carica preferenze sync (NO chiamate API bloccanti)
      addLog({ phase: 'preparing', message: '🔍 Caricamento preferenze cartelle...' });

      const { getSyncPreferences } = await import('@/lib/email-sync-preferences');
      const preferences = await getSyncPreferences(userEmail);

      if (preferences.included_folders.length === 0) {
        addLog({ 
          phase: 'warning', 
          message: '⚠️ Nessuna preferenza configurata. Usa Unified/Turbo per inizializzare l\'indice.' 
        });
        setIsRunning(false);
        return;
      }

      // 2. ✅ CHECK: l'indice ha già dati?
      const existingFolders = await getSingleFastFoldersFromLocal(userEmail);
      const foldersWithData = existingFolders.filter(f => f.pending > 0 || f.folderName);

      if (foldersWithData.length > 0) {
        // ✅ INDICE GIÀ POPOLATO: usa logica MAX (veloce)
        addLog({ 
          phase: 'preparing', 
          message: `✅ Indice già popolato (${foldersWithData.length} cartelle). Skippo pre-popolazione.` 
        });
      } else {
        // ⚠️ INDICE VUOTO: pre-popola con LIMITI AGGRESSIVI
        addLog({ 
          phase: 'preparing', 
          message: `⚠️ Indice vuoto. Pre-popolamento LIMITATO (max 2 pagine/cartella)...` 
        });
        
        const baseFolders = preferences.included_folders;
        const { populateTempIndexForFolder } = await import('@/lib/single-fast-core');
        
        for (let i = 0; i < baseFolders.length; i++) {
          if (shouldStop.current) break;
          
          const folder = baseFolders[i];
          addLog({ 
            phase: 'preparing', 
            message: `📦 Pre-caricamento PARZIALE ${i + 1}/${baseFolders.length}: ${folder}` 
          });
          
          try {
            await populateTempIndexForFolder(folder, userEmail, {
              uid_batch_size: 50,
              page_throttle_ms: 5000,
              max_pages: 2
            }, (details) => {
              addLog({
                phase: 'preparing',
                folder: folder,
                message: `   Batch ${details.current}/${details.total}: ${details.from_email}`
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
          
          // ✅ 10s tra cartelle
          if (i < baseFolders.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 10000));
          }
        }
        
        addLog({ phase: 'preparing', message: '✅ Pre-popolazione LIMITATA completata' });
      }

      // 3. Get folders from LOCAL index (FAST, NO API)
      const folders = await getSingleFastFoldersFromLocal(userEmail);
      const foldersToSync = folders.filter(f => f.included && f.pending > 0);

      if (foldersToSync.length === 0) {
        addLog({ phase: 'completed', message: '✅ Nessuna email da importare' });
        return;
      }

      // 📋 PRE-FLIGHT SUMMARY
      const totalMissing = foldersToSync.reduce((sum, f) => sum + f.pending, 0);
      setProgress({ current: 0, total: foldersToSync.length });
      setEmailProgress({ imported: 0, total: totalMissing, skipped: 0 });
      
      addLog({ 
        phase: 'preparing', 
        message: `📋 PIANO: ${foldersToSync.length} cartelle, ${totalMissing} email totali da importare` 
      });
      
      // Dettaglio cartelle
      foldersToSync.forEach((f, i) => {
        addLog({
          phase: 'preparing',
          message: `  ${i + 1}. ${f.folderName} → ${f.pending} email da scaricare`
        });
      });

      // Pausa 3 secondi per permettere all'utente di leggere il piano
      addLog({ phase: 'preparing', message: '⏳ Avvio tra 3 secondi...' });
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 📌 RECUPERO PROGRESSO SALVATO (Resume intelligente)
      const savedProgress = JSON.parse(localStorage.getItem('singlefast_progress') || '{}');
      const startIndex = savedProgress.currentFolderIndex || 0;
      
      if (startIndex > 0) {
        addLog({ 
          phase: 'preparing', 
          message: `🔄 Ripresa dal progresso salvato: cartella ${startIndex + 1}/${foldersToSync.length}` 
        });
      }

      // 2. Loop cartelle
      for (let i = startIndex; i < foldersToSync.length; i++) {
        // Check stop
        if (shouldStop.current) {
          addLog({ phase: 'error', message: '🛑 Processo interrotto dall\'utente' });
          break;
        }
        
        const folder = foldersToSync[i];
        
        // 💾 SALVA PROGRESSO IN LOCALSTORAGE
        localStorage.setItem('singlefast_progress', JSON.stringify({
          currentFolderIndex: i,
          currentFolder: folder.folderName,
          totalFolders: foldersToSync.length
        }));
        
        // Aggiorna stato cartella corrente e fase
        setCurrentFolder(folder.folderName);
        setCurrentPhase('Calcolo email mancanti');
        setProgress({ current: i + 1, total: foldersToSync.length });
        
        addLog({
          phase: 'preparing',
          folder: folder.folderName,
          message: `🔍 Analisi cartella ${folder.folderName} [${i + 1}/${foldersToSync.length}]`
        });

        try {
          // ✅ FASE 1: Fetch UIDs pendenti dalla tabella temporanea (già pre-popolata)
          addLog({
            phase: 'preparing',
            folder: folder.folderName,
            message: `🔍 FASE 1: Recupero UIDs da importare...`
          });

          const { fetchUIDsFromTempIndex, importEmailFromTempIndex } = await import('@/lib/single-fast-core');
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
            message: `📧 FASE 2: Inizio import di ${uidsToImport.length} email...`
          });

          let successCount = 0;
          let errorCount = 0;

          // ✅ FASE 2: Import email dalla tabella temporanea
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

            } catch (error: any) {
              console.error(`Error importing email UID ${uid}:`, error);
              errorCount++;
              setEmailProgress(prev => ({ ...prev, skipped: prev.skipped + 1 }));
              addLog({
                phase: 'skip',
                folder: folder.folderName,
                message: `⚠️ Skip UID ${uid}: ${error.message}`
              });
            }

            if (shouldStop.current) {
              addLog({ phase: 'error', message: '🛑 Arresto richiesto' });
              break;
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
            message: `✅ Completata ${folder.folderName}: ${successCount}/${uidsToImport.length} email importate${errorCount > 0 ? ` (${errorCount} errori)` : ''}`
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

      // 🎉 COMPLETAMENTO: Pulisci localStorage
      localStorage.removeItem('singlefast_progress');
      
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
    currentFolder,
    currentPhase,
    progress,
    emailProgress,
    startSingleFast,
    reset,
    pauseProcess,
    resumeProcess,
    stopProcess
  };
}

// ✅ FUNZIONE HELPER PER SALVARE ERRORI IN DATABASE
async function saveErrorToDatabase(uid: string, folder: string, userEmail: string, error: any) {
  try {
    const errorType = error.message.includes('map') ? 'map_undefined' 
                    : error.message.includes('Edge function') || error.message.includes('Edge Function') ? 'edge_function'
                    : error.message.includes('network') ? 'network' 
                    : 'unknown';
    
    await supabase.from('email_import_errors').upsert({
      uid,
      folder_name: folder,
      user_email: userEmail,
      error_message: error.message || 'Unknown error',
      error_type: errorType,
      status: 'pending',
      metadata: {
        stack: error.stack?.substring(0, 500),
        timestamp: new Date().toISOString()
      }
    }, { 
      onConflict: 'uid,folder_name,user_email',
      ignoreDuplicates: false 
    });
  } catch (dbErr) {
    console.warn('⚠️ Non riesco a salvare errore in DB:', dbErr);
    // Non blocchiamo il flusso principale
  }
}
