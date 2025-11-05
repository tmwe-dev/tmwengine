/**
 * HOOK SINGLE FAST - Gestione stato e log real-time
 */

import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getSingleFastFolders } from '@/lib/single-fast-core';
import { emailMessageApi } from '@/lib/tmwe-api-integrated';

// Costante per provider TMWE (ID dalla tabella email_provider)
const TMWE_PROVIDER_ID = '00000000-0000-0000-0000-000000000000';

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
  const [currentFolder, setCurrentFolder] = useState<string>('');
  const [currentPhase, setCurrentPhase] = useState<string>('');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [emailProgress, setEmailProgress] = useState({ imported: 0, total: 0 });
  
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
    setEmailProgress({ imported: 0, total: 0 });

    try {
      const userEmail = await getUserEmail();
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
      setEmailProgress({ imported: 0, total: totalMissing });
      
      addLog({ 
        phase: 'preparing', 
        message: `📋 PIANO: ${foldersToSync.length} cartelle, ${totalMissing} email totali da importare` 
      });
      
      // Dettaglio cartelle
      foldersToSync.forEach((f, i) => {
        addLog({
          phase: 'preparing',
          message: `  ${i + 1}. ${f.folderName} → ${f.missing} email da scaricare`
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
          // 📊 STEP 1: Ottieni UIDs dal server (chiamata leggera, solo lista UIDs)
          addLog({
            phase: 'preparing',
            folder: folder.folderName,
            message: `📡 Recupero lista UIDs dal server...`
          });
          
          const serverResponse = await emailMessageApi.getMessages({
            folder: folder.folderName,
            page: 1,
            limit: 5000, // Aumentato da 500 a 5000
            format: 'text',
            include_attachments: false
          });

          const serverUIDs = new Set(
            serverResponse.messages.map(m => String(m.id || m.uid))
          );

          addLog({
            phase: 'preparing',
            folder: folder.folderName,
            message: `✅ ${serverUIDs.size} email sul server`
          });

          // 📊 STEP 2: Ottieni message_ids dal DB locale
          addLog({
            phase: 'preparing',
            folder: folder.folderName,
            message: `💾 Controllo database locale...`
          });

          const { data: dbMessages } = await supabase
            .from('email_messages')
            .select('message_id')
            .eq('user_email', userEmail)
            .eq('cartella', folder.folderName);

          // Estrai UID da message_id (formato: "folder/uid" o direttamente "uid")
          const dbUIDs = new Set(
            (dbMessages || []).map((msg: any) => {
              const messageId = String(msg.message_id);
              
              // Se contiene "/", prendi l'ultima parte
              if (messageId.includes('/')) {
                const parts = messageId.split('/');
                return parts[parts.length - 1];
              }
              
              // Se è un numero, usalo direttamente
              if (/^\d+$/.test(messageId)) {
                return messageId;
              }
              
              // Se è formato RFC, prova a estrarre UID
              if (messageId.startsWith('<') && messageId.endsWith('>')) {
                const match = messageId.match(/\/(\d+)@/);
                if (match) return match[1];
              }
              
              // Fallback: usa il valore completo
              return messageId;
            })
          );

          addLog({
            phase: 'preparing',
            folder: folder.folderName,
            message: `✅ ${dbUIDs.size} email già nel database`
          });

          // 📊 STEP 3: Calcola UIDs mancanti
          const missingUIDs = Array.from(serverUIDs).filter((uid): uid is string => !dbUIDs.has(String(uid)));

          if (missingUIDs.length === 0) {
            addLog({
              phase: 'completed',
              folder: folder.folderName,
              message: `✅ Cartella ${folder.folderName} già sincronizzata (0 email mancanti)`
            });
            continue;
          }

          addLog({
            phase: 'preparing',
            folder: folder.folderName,
            message: `📧 ${missingUIDs.length} email da importare`
          });

          // Aggiorna fase
          setCurrentPhase('Import email');
          
          addLog({
            phase: 'importing',
            folder: folder.folderName,
            message: `📧 Inizio import da ${folder.folderName} (${missingUIDs.length} email)`
          });

          let successCount = 0;
          let errorCount = 0;

          // 📧 IMPORT DIRETTO: Scarica e salva ogni email (1 chiamata API per email)
          for (let j = 0; j < missingUIDs.length; j++) {
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
            
            const uid = missingUIDs[j];
            
            try {
              // 🔽 SCARICA EMAIL COMPLETA (1 sola volta!)
              const uidNumber = parseInt(String(uid), 10);
              const { data: response, error: fetchError } = await supabase.functions.invoke('tmwe-api-proxy', {
                body: {
                  endpoint: '/email_message',
                  data: {
                    handler: 'get_message',
                    uid: uidNumber,
                    folder: folder.folderName,
                    mark_as_read: false
                  }
                }
              });

              if (fetchError) throw fetchError;
              if (!response?.success) throw new Error(response?.error || 'Errore API');

              const header = response.data?.header || {};
              const body = response.data || {};

              // Normalizza dati
              const emailData = {
                message_id: header.message_id || `${folder.folderName}/${uid}`,
                subject: header.subject || '(nessun oggetto)',
                from_email: typeof header.from === 'string' ? header.from : (header.from?.email || header.from?.address || ''),
                from_name: header.from_name || header.from?.name || null,
                to_email: Array.isArray(header.to)
                  ? header.to.map((t: any) => t.email || t.address || t).join(',')
                  : (header.to || ''),
                cc_email: Array.isArray(header.cc) && header.cc.length > 0
                  ? header.cc.map((c: any) => c.email || c.address || c).join(',')
                  : null,
                bcc_email: Array.isArray(header.bcc) && header.bcc.length > 0
                  ? header.bcc.map((b: any) => b.email || b.address || b).join(',')
                  : null,
                data_ricezione: header.date || new Date().toISOString(),
                body_text: body.body_plain || '',
                body_html: body.body_html || '',
                flags: [
                  ...(header.seen ? ['\\Seen'] : []),
                  ...(header.flagged ? ['\\Flagged'] : []),
                  ...(header.answered ? ['\\Answered'] : [])
                ],
                attachments: header.attachments || []
              };

              // 💾 INSERISCI IN DATABASE (usando i campi corretti del database)
              const { error: insertError } = await supabase
                .from('email_messages')
                .insert({
                  user_email: userEmail,
                  message_id: emailData.message_id,
                  provider_id: TMWE_PROVIDER_ID,
                  cartella: folder.folderName,
                  subject: emailData.subject,
                  from_email: emailData.from_email,
                  from_name: emailData.from_name,
                  to_email: emailData.to_email,
                  cc_email: emailData.cc_email,
                  bcc_email: emailData.bcc_email,
                  data_ricezione: emailData.data_ricezione 
                    ? new Date(emailData.data_ricezione).toISOString() 
                    : new Date().toISOString(),
                  body_text: emailData.body_text,
                  body_html: emailData.body_html,
                  flags: emailData.flags,
                  attachments: emailData.attachments,
                  direzione: 'inbound',
                  sync_status: 'sincronizzato',
                  stato: emailData.flags?.includes('\\Seen') ? 'letto' : 'nuovo'
                });

              if (insertError) {
                // Ignora errori di duplicati
                if (insertError.code === '23505') {
                  console.log(`⚠️ Email ${uid} già esistente, skip`);
                } else {
                  // Log dettagliato per altri errori
                  console.error('❌ Errore inserimento DB:', {
                    uid,
                    folder: folder.folderName,
                    error: insertError,
                    code: insertError.code,
                    message: insertError.message,
                    details: insertError.details
                  });
                  throw insertError;
                }
              }

              successCount++;
              
              // Aggiorna contatore email importate
              setEmailProgress(prev => ({ ...prev, imported: prev.imported + 1 }));

              // Log con dettagli email
              const fromName = emailData.from_name || emailData.from_email;
              addLog({
                phase: 'importing',
                folder: folder.folderName,
                message: `✅ ${fromName}`,
                count: { current: j + 1, total: missingUIDs.length }
              });

              // Throttle per non sovraccaricare
              if (j % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, 100));
              }
            } catch (err: any) {
              console.error(`❌ Error importing UID ${uid}:`, err);
              errorCount++;
              addLog({
                phase: 'error',
                folder: folder.folderName,
                message: `❌ Errore import UID ${uid}: ${err.message}`
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
            message: `✅ Completata ${folder.folderName}: ${successCount}/${missingUIDs.length} email importate${errorCount > 0 ? ` (${errorCount} errori)` : ''}`
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
