import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LoadingState } from '@/components/design-system/data-display/LoadingState';
import { supabase } from '@/integrations/supabase/client';
import { emailMessageApi } from '@/lib/tmwe-api-integrated';
import { getSingleMailFolders } from '@/lib/single-mail-api';
import { getSyncPreferences } from '@/lib/email-sync-preferences';
import { toast } from 'sonner';
import { RefreshCw, Eye, Download, CheckSquare, Square, Loader2, AlertTriangle, Archive, FolderEdit, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useUserEmail } from '@/hooks/useUserEmail';
import { normalizeEmailMessage } from '@/lib/email/email-mapper';
import { prepareEmailForDatabase } from '@/lib/email/email-database-mapper';

interface MissingEmailItem {
  uid: string;
  subject: string;
  from_email: string;
  from_name: string;
  date: string;
  selected: boolean;
}

interface OrphanFolderAnalysis {
  name: string;
  total_emails: number;
  found_elsewhere: number;
  not_found: number;
  locations: Record<string, number>; // cartella -> count
  analyzing: boolean;
}

// ✅ Logging solo in dev mode
const DEBUG = import.meta.env.DEV;
const log = DEBUG ? console.log : () => {};

export function SingleMailImporter() {
  const queryClient = useQueryClient();
  const { data: userEmail } = useUserEmail();
  const [selectedFolder, setSelectedFolder] = useState('INBOX');
  const [missingEmails, setMissingEmails] = useState<MissingEmailItem[]>([]);
  const [selectedEmailDetail, setSelectedEmailDetail] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importingUid, setImportingUid] = useState<string | null>(null);
  const [displayLimit, setDisplayLimit] = useState(100); // ✅ Lazy loading: inizialmente 100 email
  const [showArchived, setShowArchived] = useState(false); // ✅ Filtro per visualizzare email archiviate
  const [orphanFolderToRename, setOrphanFolderToRename] = useState<{ name: string; count: number } | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // ✅ Query cartelle disponibili (API DEDICATA - NO CACHE CONDIVISA)
  const { data: foldersData } = useQuery({
    queryKey: ['email-folders-single-dedicated'],
    queryFn: async () => {
      const folders = await getSingleMailFolders({ include_counts: false });
      log('📁 [SingleMail] Folders fetched:', folders.length, folders.map((f: any) => f.name));
      return folders;
    },
    staleTime: 5 * 60 * 1000,
  });

  // ✅ Query conteggi unificati per tutte le cartelle
  const { data: folderCounts } = useQuery({
    queryKey: ['email-folder-counts-single'],
    queryFn: async () => {
      if (!userEmail) throw new Error('User email non disponibile');

      // ✅ Usa servizio unificato
      const { getUnifiedFolderCounts } = await import('@/lib/email-count-service');
      return await getUnifiedFolderCounts(userEmail);
    },
    staleTime: 2 * 60 * 1000, // Cache 2 minuti
    enabled: !!foldersData && !!userEmail,
  });



  // ✅ Query confronto UIDs mancanti + popola email_temp_index
  const {
    data: comparisonData,
    isLoading: isLoadingComparison,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['single-mail-comparison', selectedFolder],
    queryFn: async () => {
      if (!userEmail) throw new Error('User email non disponibile');
      
      log('🔍 [SingleMailImporter] Fetching comparison for folder:', selectedFolder);

      // 2️⃣ Svuota tabella temporanea per questa cartella
      await supabase
        .from('email_temp_index')
        .delete()
        .eq('user_email', userEmail)
        .eq('folder', selectedFolder);

      // 2️⃣ Fetch UIDs dal server TMWE (prime 500 email)
      log('📡 Fetching server UIDs (only metadata, no body)...');
      
      const serverResponse = await emailMessageApi.getMessages({
        folder: selectedFolder,
        page: 1,
        limit: 500,
        format: 'text',
        include_attachments: false,
      });

      const serverUIDs = new Set<string>(
        serverResponse.messages.map((msg: any) => String(msg.uid))
      );
      log(`✅ Server UIDs count: ${serverUIDs.size}`);

      // 3️⃣ Fetch UIDs dal DB locale
      log('💾 Fetching local DB UIDs...');
      const { data: dbMessages, error } = await supabase
        .from('email_messages')
        .select('message_id')
        .eq('user_email', userEmail)
        .eq('cartella', selectedFolder);

      if (error) throw error;

      // ✅ Estrazione UID robusta con fallback multipli
      const dbUIDs = new Set<string>(
        (dbMessages || [])
          .map((msg: any) => {
            const messageId = String(msg.message_id);
            
            // Priorità 1: Se contiene "/", prendi l'ultima parte
            if (messageId.includes('/')) {
              const parts = messageId.split('/');
              return parts[parts.length - 1];
            }
            
            // Priorità 2: Se è un numero, usalo direttamente
            if (/^\d+$/.test(messageId)) {
              return messageId;
            }
            
            // Priorità 3: Se è formato RFC, prova a estrarre UID
            if (messageId.startsWith('<') && messageId.endsWith('>')) {
              const match = messageId.match(/\/(\d+)@/);
              if (match) return match[1];
            }
            
            // Fallback: usa il valore completo e logga warning
            log('⚠️ [SingleMailImporter] Formato message_id non riconosciuto:', messageId);
            return messageId;
          })
          .filter((uid: string) => uid && uid !== 'null')
      );
      log(`✅ DB UIDs count: ${dbUIDs.size}`);

      // 4️⃣ Calcola UIDs mancanti
      const missing = Array.from(serverUIDs).filter(uid => !dbUIDs.has(uid));
      log(`🎯 Missing UIDs: ${missing.length}`);

      // ✅ FASE 1: Archivia email "extra" (presenti in DB ma non sul server)
      const extraUIDs = Array.from(dbUIDs).filter(uid => !serverUIDs.has(uid));
      if (extraUIDs.length > 0) {
        log(`📦 Trovate ${extraUIDs.length} email extra nel DB (non più sul server), archivio...`);
        
        // Marca come archiviate (senza spostare in cartella "Archivio")
        const { error: archiveError } = await supabase
          .from('email_messages')
          .update({
            deleted_from_server: true,
            deleted_from_server_at: new Date().toISOString(),
            stato: 'archiviato',
            updated_at: new Date().toISOString(),
          })
          .eq('user_email', userEmail)
          .eq('cartella', selectedFolder)
          .in('message_id', extraUIDs.map(uid => `${selectedFolder}/${uid}`));

        if (!archiveError) {
          log(`✅ ${extraUIDs.length} email archiviate con successo`);
          toast.success(`${extraUIDs.length} email archiviate (eliminate dal server)`);
        } else {
          console.error('❌ Errore archiviazione:', archiveError);
        }
      }

      // 5️⃣ Popola email_temp_index con metadati leggeri (batch paralleli)
      const batchSize = 10;
      const tempIndexRecords = [];

      for (let i = 0; i < missing.length; i += batchSize) {
        const batch = missing.slice(i, i + batchSize);
        const batchPromises = batch.map(async (uid) => {
          try {
            const email = await emailMessageApi.getMessage(uid, selectedFolder, false);
            return {
              uid,
              folder: selectedFolder,
              user_email: userEmail,
              subject: email?.subject || email?.data?.header?.subject || null,
              from_email: email?.from || email?.data?.header?.from || 'Unknown',
              from_name: email?.from_name || email?.data?.header?.from_name || null,
              date: email?.date || email?.data?.header?.date || new Date().toISOString(),
              size: null, // Non disponibile dall'API
              status: 'pending',
            };
          } catch (err) {
            log(`⚠️ Failed to fetch metadata for UID ${uid}:`, err);
            return {
              uid,
              folder: selectedFolder,
              user_email: userEmail,
              subject: '(Error loading)',
              from_email: 'Unknown',
              from_name: null,
              date: new Date().toISOString(),
              size: null,
              status: 'pending',
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        tempIndexRecords.push(...batchResults);
      }

      // 6️⃣ Inserisci in batch in email_temp_index
      if (tempIndexRecords.length > 0) {
        const { error: insertError } = await supabase
          .from('email_temp_index')
          .insert(tempIndexRecords);

        if (insertError) {
          console.error('❌ Error inserting to email_temp_index:', insertError);
        } else {
          log(`✅ Inserted ${tempIndexRecords.length} records into email_temp_index`);
        }
      }

      return {
        totalServer: serverUIDs.size,
        totalDB: dbUIDs.size,
        totalMissing: missing.length,
      };
    },
    enabled: !!selectedFolder && !!userEmail,
    refetchOnWindowFocus: false,
  });

  // ✅ Query email da email_temp_index (lettura leggera dal DB)
  const { data: tempIndexEmails } = useQuery({
    queryKey: ['email-temp-index', selectedFolder, displayLimit],
    queryFn: async () => {
      if (!userEmail) return [];

      const { data, error } = await supabase
        .from('email_temp_index')
        .select('*')
        .eq('user_email', userEmail)
        .eq('folder', selectedFolder)
        .order('date', { ascending: false })
        .limit(displayLimit);

      if (error) {
        console.error('❌ Error fetching temp index:', error);
        return [];
      }

      return data.map((item: any) => ({
        uid: item.uid,
        subject: item.subject || '(No Subject)',
        from_email: item.from_email,
        from_name: item.from_name || '',
        date: item.date,
        selected: item.status === 'selected',
      }));
    },
    enabled: !!selectedFolder && !!comparisonData && !!userEmail,
    refetchOnWindowFocus: false,
  });

  // ✅ FASE 2: Rileva cartelle orfane CON ANALISI INTELLIGENTE
  const { data: orphanFolders, isLoading: isAnalyzingOrphans } = useQuery({
    queryKey: ['orphan-folders-intelligent', userEmail],
    queryFn: async () => {
      if (!userEmail || !foldersData) return [];

      const serverFolderNames = foldersData.map((f: any) => f.name);
      log('🔍 [Orphan Analysis] Server folders:', serverFolderNames);

      // 1️⃣ Trova cartelle nel DB che non esistono sul server
      const { data, error } = await supabase
        .from('email_messages')
        .select('cartella, message_id')
        .eq('user_email', userEmail)
        .eq('deleted_from_server', false);

      if (error) {
        console.error('❌ Error fetching orphan folders:', error);
        return [];
      }

      // 2️⃣ Raggruppa per cartella e estrai UIDs
      const orphanData: Record<string, string[]> = {};
      data.forEach((msg: any) => {
        const folder = msg.cartella;
        if (!serverFolderNames.includes(folder)) {
          if (!orphanData[folder]) orphanData[folder] = [];
          
          // Estrai UID dal message_id
          const messageId = String(msg.message_id);
          let uid = '';
          
          if (messageId.includes('/')) {
            const parts = messageId.split('/');
            uid = parts[parts.length - 1];
          } else if (/^\d+$/.test(messageId)) {
            uid = messageId;
          }
          
          if (uid && uid !== 'null') {
            orphanData[folder].push(uid);
          }
        }
      });

      log('📂 [Orphan Analysis] Cartelle orfane trovate:', Object.keys(orphanData));

      // 3️⃣ Per ogni cartella orfana, cerca UIDs su TUTTE le cartelle del server
      const results: OrphanFolderAnalysis[] = [];
      
      for (const [folderName, uids] of Object.entries(orphanData)) {
        log(`🔍 [Orphan Analysis] Analizzando ${folderName} con ${uids.length} UIDs`);
        
        const analysis: OrphanFolderAnalysis = {
          name: folderName,
          total_emails: uids.length,
          found_elsewhere: 0,
          not_found: 0,
          locations: {},
          analyzing: true,
        };

        // 4️⃣ Cerca ogni UID su TUTTE le cartelle del server (batch paralleli)
        const BATCH_SIZE = 10;
        const foundUIDs = new Set<string>();
        
        for (let i = 0; i < uids.length; i += BATCH_SIZE) {
          const batch = uids.slice(i, i + BATCH_SIZE);
          
          const batchResults = await Promise.allSettled(
            batch.map(async (uid) => {
              // Cerca su tutte le cartelle server
              for (const serverFolder of serverFolderNames) {
                try {
                  const response = await emailMessageApi.getMessage(uid, serverFolder, false);
                  if (response && response.uid) {
                    log(`✅ [Orphan Analysis] UID ${uid} trovato in ${serverFolder}`);
                    foundUIDs.add(uid);
                    analysis.locations[serverFolder] = (analysis.locations[serverFolder] || 0) + 1;
                    return { uid, found: true, location: serverFolder };
                  }
                } catch (error) {
                  // UID non trovato in questa cartella, continua
                }
              }
              return { uid, found: false };
            })
          );

          // Aggiorna conteggi intermedi
          batchResults.forEach((result) => {
            if (result.status === 'fulfilled' && !result.value.found) {
              // UID non trovato su nessuna cartella
            }
          });
        }

        // 5️⃣ Calcola statistiche finali
        analysis.found_elsewhere = foundUIDs.size;
        analysis.not_found = uids.length - foundUIDs.size;
        analysis.analyzing = false;

        log(`✅ [Orphan Analysis] ${folderName}: ${analysis.found_elsewhere} trovate, ${analysis.not_found} eliminate`);
        results.push(analysis);
      }

      return results;
    },
    enabled: !!userEmail && !!foldersData,
    refetchOnWindowFocus: false,
    staleTime: 10 * 60 * 1000, // Cache 10 minuti (analisi pesante)
  });

  // ✅ Reset displayLimit quando cambia cartella
  useEffect(() => {
    setDisplayLimit(100);
  }, [selectedFolder]);

  // ✅ Aggiorna lista locale quando cambia tempIndexEmails
  useEffect(() => {
    if (tempIndexEmails) {
      setMissingEmails(tempIndexEmails);
    }
  }, [tempIndexEmails]);

  // ✅ Toggle singola email (aggiorna DB temp_index)
  const toggleEmailSelection = async (uid: string) => {
    if (!userEmail) return;
    
    const email = missingEmails.find(e => e.uid === uid);
    if (!email) return;

    const newStatus = email.selected ? 'pending' : 'selected';

    setMissingEmails(prev =>
      prev.map(e => e.uid === uid ? { ...e, selected: !e.selected } : e)
    );

    await supabase
      .from('email_temp_index')
      .update({ status: newStatus })
      .eq('uid', uid)
      .eq('folder', selectedFolder)
      .eq('user_email', userEmail);
  };

  // ✅ Select All / Deselect All (aggiorna DB temp_index)
  const toggleSelectAll = async () => {
    if (!userEmail) return;
    
    const allSelected = missingEmails.every(e => e.selected);
    const newStatus = allSelected ? 'pending' : 'selected';

    setMissingEmails(prev =>
      prev.map(email => ({ ...email, selected: !allSelected }))
    );

    await supabase
      .from('email_temp_index')
      .update({ status: newStatus })
      .eq('folder', selectedFolder)
      .eq('user_email', userEmail);
  };

  // ✅ Visualizza email completa
  const handleViewEmail = async (uid: string) => {
    try {
      toast.info(`Caricamento email UID ${uid}...`);
      const email = await emailMessageApi.getMessage(uid, selectedFolder, false);
      setSelectedEmailDetail({
        uid,
        ...email,
      });
    } catch (error: any) {
      toast.error(`Errore caricamento email: ${error.message}`);
    }
  };

  // ✅ Funzione helper per verificare se email esiste già
  const checkEmailExists = async (messageId: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('email_messages')
      .select('id')
      .eq('message_id', messageId)
      .maybeSingle();
    
    if (error) {
      console.error('❌ Errore controllo duplicati:', error);
      return false; // In caso di errore, procedi con import
    }
    
    return !!data; // Ritorna true se esiste, false altrimenti
  };

  // ✅ Importa singola email nel DB
  const handleImportSingle = async (uid: string, folder: string) => {
    if (!userEmail) return;
    
    setImportingUid(uid);
    try {
      // ✅ Controllo se email già esiste
      const messageId = `${folder}/${uid}`;
      const exists = await checkEmailExists(messageId);

      if (exists) {
        log(`⚠️ Email ${uid} già presente nel database, skip import`);
        toast.warning(`Email UID ${uid} già presente nel database locale`);
        setMissingEmails(prev => prev.filter(e => e.uid !== uid));
        return;
      }

      log(`✅ Email ${uid} non presente, procedo con import`);

      // ✅ Fetch + normalizza email
      const apiEmail = await emailMessageApi.getMessage(uid, folder, false);
      const normalized = normalizeEmailMessage(apiEmail, uid, folder);

      // ✅ Prepara per database (funzione centralizzata)
      const emailToSave = prepareEmailForDatabase(normalized, folder, userEmail);

      log('📤 [SingleMailImporter] INSERT BODY:', JSON.stringify(emailToSave, null, 2));

      // ✅ Insert in database
      const { error } = await supabase
        .from('email_messages')
        .insert(emailToSave);

      if (error) {
        console.error('❌ [SingleMailImporter] Supabase error:', error);
        throw error;
      }

      toast.success(`✅ Email UID ${uid} importata con successo`);

      // Aggiorna status in temp_index + rimuovi dalla lista
      await supabase
        .from('email_temp_index')
        .update({ status: 'imported' })
        .eq('uid', uid)
        .eq('folder', folder)
        .eq('user_email', userEmail);

      setMissingEmails(prev => prev.filter(e => e.uid !== uid));
    } catch (error: any) {
      toast.error(`❌ Errore import: ${error.message}`);
    } finally {
      setImportingUid(null);
    }
  };

  // ✅ Importa tutte le email selezionate (BATCH PARALLELI)
  const handleImportSelected = async () => {
    if (!userEmail) return;
    
    const selectedUIDs = missingEmails.filter(e => e.selected).map(e => e.uid);
    if (selectedUIDs.length === 0) {
      toast.warning('Nessuna email selezionata');
      return;
    }

    setIsImporting(true);
    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    try {
      // ✅ BATCH PARALLELI: 5 email alla volta
      const BATCH_SIZE = 5;
      
      for (let i = 0; i < selectedUIDs.length; i += BATCH_SIZE) {
        const batch = selectedUIDs.slice(i, i + BATCH_SIZE);
        
        const results = await Promise.allSettled(
          batch.map(async (uid) => {
            // ✅ CONTROLLO DUPLICATO
            const messageId = `${selectedFolder}/${uid}`;
            const exists = await checkEmailExists(messageId);
            
            if (exists) {
              log(`⚠️ [SingleMailImporter] Email ${uid} già presente, skip`);
              
              // Aggiorna status in temp_index
              await supabase
                .from('email_temp_index')
                .update({ status: 'imported' })
                .eq('uid', uid)
                .eq('folder', selectedFolder)
                .eq('user_email', userEmail);
              
              return { status: 'skipped' as const, uid };
            }
            
            log(`🔍 [SingleMailImporter] Fetching email UID ${uid} from ${selectedFolder}`);
            
            // ✅ Fetch + normalizza email
            const apiEmail = await emailMessageApi.getMessage(uid, selectedFolder, false);
            const normalized = normalizeEmailMessage(apiEmail, uid, selectedFolder);

            // ✅ Prepara per database (funzione centralizzata)
            const emailToSave = prepareEmailForDatabase(normalized, selectedFolder, userEmail);

            log('📤 [SingleMailImporter] INSERT BODY:', JSON.stringify(emailToSave, null, 2));

            // ✅ Insert in database
            const { error } = await supabase
              .from('email_messages')
              .insert(emailToSave);

            if (error) {
              console.error('❌ [SingleMailImporter] Supabase error:', error);
              throw error;
            }

            // Aggiorna status in temp_index
            await supabase
              .from('email_temp_index')
              .update({ status: 'imported' })
              .eq('uid', uid)
              .eq('folder', selectedFolder)
              .eq('user_email', userEmail);

            return { status: 'success' as const, uid };
          })
        );

        // ✅ Conta risultati batch
        results.forEach((result, idx) => {
          const uid = batch[idx];
          
          if (result.status === 'fulfilled') {
            if (result.value.status === 'skipped') {
              skippedCount++;
            } else {
              successCount++;
            }
            setMissingEmails(prev => prev.filter(e => e.uid !== uid));
          } else {
            console.error(`❌ Error importing UID ${uid}:`, result.reason);
            errorCount++;
          }
        });
      }

      // ✅ TOAST CON CONTATORI
      const message = skippedCount > 0 
        ? `✅ Importate ${successCount} email (${skippedCount} già presenti${errorCount > 0 ? `, ${errorCount} errori` : ''})`
        : `✅ Importate ${successCount} email${errorCount > 0 ? ` (${errorCount} errori)` : ''}`;
      
      toast.success(message);
    } catch (error: any) {
      toast.error(`❌ Errore import: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };


  // ✅ Helper per trovare statistiche cartella (memoizzato)
  const getFolderStats = useMemo(() => (folderName: string) => {
    // ✅ Se è la cartella selezionata E abbiamo comparisonData, usa quello (confronto UID-per-UID)
    if (folderName === selectedFolder && comparisonData) {
      const syncPercentage = comparisonData.totalServer > 0 
        ? Math.round((comparisonData.totalDB / comparisonData.totalServer) * 100)
        : 0;
      
      return {
        folderName,
        serverCount: comparisonData.totalServer,
        dbCount: comparisonData.totalDB,
        missing: comparisonData.totalMissing,
        syncPercentage,
        serverSource: 'comparison' as const,
        errors: [],
        isTestable: true,
      };
    }
    
    // ✅ Altrimenti usa folderCounts (conteggio generale per altre cartelle)
    if (!folderCounts) return null;
    return folderCounts.find(f => f.folderName === folderName);
  }, [selectedFolder, comparisonData, folderCounts]);

  // ✅ FASE 2: Handlers per cartelle orfane
  const handleRenameFolder = async (oldName: string, newName: string) => {
    if (!userEmail || !newName.trim()) return;

    try {
      // Prima, ottieni tutti i message_id da aggiornare
      const { data: messages, error: fetchError } = await supabase
        .from('email_messages')
        .select('id, message_id')
        .eq('user_email', userEmail)
        .eq('cartella', oldName);

      if (fetchError) throw fetchError;

      // Aggiorna ogni messaggio individualmente
      if (messages && messages.length > 0) {
        for (const msg of messages) {
          const newMessageId = msg.message_id.replace(`${oldName}/`, `${newName}/`);
          
          await supabase
            .from('email_messages')
            .update({
              cartella: newName,
              message_id: newMessageId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', msg.id);
        }
      }

      // Aggiorna email_temp_index
      const { error: tempError } = await supabase
        .from('email_temp_index')
        .update({ folder: newName })
        .eq('user_email', userEmail)
        .eq('folder', oldName);

      if (tempError) throw tempError;

      toast.success(`✅ Cartella rinominata: ${oldName} → ${newName} (${messages?.length || 0} email aggiornate)`);
      queryClient.invalidateQueries({ queryKey: ['orphan-folders'] });
      queryClient.invalidateQueries({ queryKey: ['email-folder-counts-single'] });
    } catch (error: any) {
      toast.error(`❌ Errore rinominazione: ${error.message}`);
    }
  };

  const handleArchiveFolder = async (folderName: string) => {
    if (!userEmail) return;

    try {
      const { error } = await supabase
        .from('email_messages')
        .update({
          deleted_from_server: true,
          deleted_from_server_at: new Date().toISOString(),
          stato: 'archiviato',
          updated_at: new Date().toISOString(),
        })
        .eq('user_email', userEmail)
        .eq('cartella', folderName)
        .eq('deleted_from_server', false);

      if (error) throw error;

      toast.success(`✅ Cartella "${folderName}" archiviata`);
      queryClient.invalidateQueries({ queryKey: ['orphan-folders'] });
    } catch (error: any) {
      toast.error(`❌ Errore archiviazione: ${error.message}`);
    }
  };

  const handleDeleteFolder = async (folderName: string) => {
    if (!userEmail) return;

    const confirmed = window.confirm(
      `⚠️ ATTENZIONE: Stai per eliminare DEFINITIVAMENTE tutte le email dalla cartella "${folderName}".\n\nQuesta operazione è IRREVERSIBILE.\n\nSei sicuro?`
    );

    if (!confirmed) return;

    const doubleConfirm = window.confirm(
      `⚠️⚠️ ULTIMA CONFERMA ⚠️⚠️\n\nStai per eliminare permanentemente la cartella "${folderName}" e TUTTE le sue email.\n\nDigita "ELIMINA" per confermare (case sensitive).`
    );

    if (!doubleConfirm) return;

    try {
      // Elimina da email_messages
      const { error: emailError } = await supabase
        .from('email_messages')
        .delete()
        .eq('user_email', userEmail)
        .eq('cartella', folderName);

      if (emailError) throw emailError;

      // Elimina da email_temp_index
      const { error: tempError } = await supabase
        .from('email_temp_index')
        .delete()
        .eq('user_email', userEmail)
        .eq('folder', folderName);

      if (tempError) throw tempError;

      toast.success(`✅ Cartella "${folderName}" eliminata definitivamente`);
      queryClient.invalidateQueries({ queryKey: ['orphan-folders'] });
    } catch (error: any) {
      toast.error(`❌ Errore eliminazione: ${error.message}`);
    }
  };

  const allSelected = missingEmails.length > 0 && missingEmails.every(e => e.selected);
  const selectedCount = missingEmails.filter(e => e.selected).length;

  return (
    <div className="space-y-6">
      {/* Header con folder selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col items-center gap-4">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <span>Single Mail Importer</span>
                <Badge variant="outline" className="text-xs">
                  Confronto manuale per cartella
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = '/single-fast'}
                className="gap-2"
              >
                🚀 Vai a Single Fast
                <span className="text-xs text-muted-foreground ml-1">(sincronizzazione massiva)</span>
              </Button>
            </div>
            <div className="flex items-center gap-4 justify-center w-full">
              <Select value={selectedFolder} onValueChange={setSelectedFolder}>
                <SelectTrigger className="w-96">
                  <SelectValue placeholder="Seleziona cartella" />
                </SelectTrigger>
                <SelectContent className="z-[9999] bg-background" align="center">
                  {foldersData?.map((folder: any) => {
                    const stats = getFolderStats(folder.name);
                    const hasMissing = stats && stats.missing > 0;
                    
                    return (
                      <SelectItem key={folder.name} value={folder.name}>
                        <div className="grid grid-cols-[1fr_auto_auto] items-center w-full gap-4 min-w-[400px]">
                          {/* COLONNA 1: Nome Cartella */}
                          <span className={cn(
                            "font-medium text-left truncate",
                            hasMissing && "text-orange-600 dark:text-orange-400"
                          )}>
                            {folder.display_name || folder.name}
                          </span>
                          
                          {/* COLONNA 2: Conteggi */}
                          <div className="flex justify-end">
                            {stats ? (
                              <Badge variant="outline" className="text-xs tabular-nums">
                                {stats.dbCount}/{stats.serverCount}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                ...
                              </Badge>
                            )}
                          </div>
                          
                          {/* COLONNA 3: Icone Status */}
                          <div className="flex justify-end items-center gap-2 min-w-[80px]">
                            {stats && hasMissing && (
                              <Badge 
                                variant="destructive" 
                                className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-xs"
                              >
                                📬 {stats.missing}
                              </Badge>
                            )}
                            
                            {stats && stats.syncPercentage === 100 && (
                              <Badge 
                                variant="outline" 
                                className="bg-green-500/10 text-green-600 border-green-500/20 text-xs"
                              >
                                ✓
                              </Badge>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoadingComparison || isRefetching}
              >
                <RefreshCw className={cn('h-4 w-4 mr-2', isRefetching && 'animate-spin')} />
                Refresh
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* ✅ FASE 2: Alert cartelle orfane CON ANALISI INTELLIGENTE */}
          {isAnalyzingOrphans && (
            <Alert className="border-blue-500/50 bg-blue-500/10">
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertTitle>Analisi cartelle in corso...</AlertTitle>
              <AlertDescription>
                Sto verificando se le email delle cartelle orfane sono presenti altrove sul server
              </AlertDescription>
            </Alert>
          )}

          {orphanFolders && orphanFolders.length > 0 && (
            <Alert variant="destructive" className="border-orange-500/50 bg-orange-500/10">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Cartelle orfane rilevate - Analisi intelligente completata</AlertTitle>
              <AlertDescription className="space-y-3 mt-2">
                {orphanFolders.map((folder: OrphanFolderAnalysis) => (
                  <div key={folder.name} className="p-4 bg-background/50 rounded-lg border border-orange-500/20">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div>
                          <p className="font-semibold text-sm">📁 {folder.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {folder.total_emails} email nel database locale, cartella non più presente sul server
                          </p>
                        </div>

                        {/* Statistiche analisi */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-2 bg-green-500/10 border border-green-500/20 rounded">
                            <p className="text-xs text-muted-foreground">Trovate altrove</p>
                            <p className="text-lg font-bold text-green-600">
                              {folder.found_elsewhere} 
                              <span className="text-xs font-normal ml-1">
                                ({Math.round((folder.found_elsewhere / folder.total_emails) * 100)}%)
                              </span>
                            </p>
                          </div>
                          <div className="p-2 bg-red-500/10 border border-red-500/20 rounded">
                            <p className="text-xs text-muted-foreground">Eliminate dal server</p>
                            <p className="text-lg font-bold text-red-600">
                              {folder.not_found}
                              <span className="text-xs font-normal ml-1">
                                ({Math.round((folder.not_found / folder.total_emails) * 100)}%)
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* Dettaglio posizioni */}
                        {Object.keys(folder.locations).length > 0 && (
                          <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded">
                            <p className="text-xs text-muted-foreground mb-2">📍 Trovate in:</p>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(folder.locations).map(([location, count]) => (
                                <Badge key={location} variant="outline" className="text-xs">
                                  {location}: {count}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Suggerimento azione */}
                        <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded">
                          <p className="text-xs font-semibold text-yellow-600 dark:text-yellow-400">
                            💡 Azione suggerita:
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {folder.found_elsewhere > folder.not_found 
                              ? `La maggior parte delle email (${folder.found_elsewhere}/${folder.total_emails}) è stata SPOSTATA altrove. → Suggerisco RINOMINA verso la cartella principale dove sono state trovate.`
                              : folder.not_found === folder.total_emails
                              ? `Tutte le email sono state ELIMINATE dal server. → Suggerisco ARCHIVIA per mantenerle nel DB locale o ELIMINA se non servono più.`
                              : `Mix di email spostate (${folder.found_elsewhere}) ed eliminate (${folder.not_found}). → Suggerisco ARCHIVIA per mantenerle tutte nel DB locale, o ELIMINA se non servono più.`
                            }
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setOrphanFolderToRename({ name: folder.name, count: folder.total_emails });
                            setRenameDialogOpen(true);
                          }}
                          className="gap-2 whitespace-nowrap"
                        >
                          <FolderEdit className="h-4 w-4" />
                          Rinomina
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleArchiveFolder(folder.name)}
                          className="gap-2 whitespace-nowrap"
                        >
                          <Archive className="h-4 w-4" />
                          Archivia
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteFolder(folder.name)}
                          className="gap-2 whitespace-nowrap"
                        >
                          <Trash2 className="h-4 w-4" />
                          Elimina
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </AlertDescription>
            </Alert>
          )}

          {/* Indicatore caricamento conteggi */}
          {!folderCounts && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Caricamento conteggi cartelle...
            </div>
          )}

          {/* Riepilogo statistiche cartella selezionata */}
          {selectedFolder && getFolderStats(selectedFolder) && (
            <div className="p-4 bg-muted/50 rounded-lg border">
              <div className="grid grid-cols-3 gap-4 text-center mb-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Server</p>
                  <p className="text-2xl font-bold text-primary">{getFolderStats(selectedFolder)!.serverCount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">DB Locale</p>
                  <p className="text-2xl font-bold text-blue-600">{getFolderStats(selectedFolder)!.dbCount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Mancanti</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    getFolderStats(selectedFolder)!.missing > 0 ? "text-orange-600" : "text-green-600"
                  )}>
                    {getFolderStats(selectedFolder)!.missing}
                  </p>
                </div>
              </div>
              
              {/* Progress bar sincronizzazione */}
              <div>
                {(() => {
                  const stats = getFolderStats(selectedFolder)!;
                  const syncPercentage = Math.min(100, stats.syncPercentage);  // ✅ Cap a 100%
                  const isOverSynced = stats.dbCount > stats.serverCount;  // ✅ Rileva se DB ha più email
                  
                  return (
                    <>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Sincronizzazione</span>
                        <span className={cn(
                          "font-semibold",
                          isOverSynced && "text-orange-600 dark:text-orange-400"
                        )}>
                          {isOverSynced 
                            ? `+${stats.dbCount - stats.serverCount} extra` 
                            : `${syncPercentage}%`
                          }
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full transition-all duration-500",
                            syncPercentage === 100 ? "bg-green-500" : "bg-orange-500"
                          )}
                          style={{ width: `${syncPercentage}%` }}
                        />
                      </div>
                      {isOverSynced && (
                        <div className="mt-2 text-xs text-orange-600 dark:text-orange-400">
                          ⚠️ Il database locale ha {stats.dbCount - stats.serverCount} email in più rispetto al server
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Warning se limite 500 raggiunto */}
          {comparisonData && comparisonData.totalServer >= 500 && (
            <div className="p-4 bg-orange-500/10 border-2 border-orange-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="text-2xl">⚠️</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-orange-700 dark:text-orange-400 mb-1">
                    Limite 500 email raggiunto
                  </h4>
                  <p className="text-sm text-orange-600 dark:text-orange-300 mb-2">
                    Il confronto è limitato alle <strong>prime 500 email</strong> della cartella per evitare timeout del server.
                  </p>
                  <p className="text-sm text-orange-600 dark:text-orange-300">
                    💡 <strong>Suggerimento:</strong> Usa la pagina <strong>Single Fast</strong> per sincronizzare 
                    l'intera cartella senza limiti.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ✅ FASE 1: Checkbox per mostrare email archiviate */}
          <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border">
            <Checkbox
              id="show-archived"
              checked={showArchived}
              onCheckedChange={(checked) => setShowArchived(checked as boolean)}
            />
            <label
              htmlFor="show-archived"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Mostra email archiviate (eliminate dal server)
            </label>
          </div>

          {/* Badge visualizzazione parziale + pulsante "Carica altre 100" */}
          {comparisonData && comparisonData.totalMissing > 0 && (
            <div className="flex items-center justify-between gap-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                  {missingEmails.length} di {comparisonData.totalMissing} visibili
                </Badge>
                {missingEmails.length < comparisonData.totalMissing && (
                  <span className="text-xs text-muted-foreground">
                    ({comparisonData.totalMissing - missingEmails.length} rimanenti in cache)
                  </span>
                )}
              </div>
              {missingEmails.length < comparisonData.totalMissing && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setDisplayLimit(prev => Math.min(prev + 100, comparisonData.totalMissing))}
                >
                  <Download className="h-4 w-4" />
                  Carica altre 100
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>


      {/* Lista email mancanti */}
      {isLoadingComparison ? (
        <LoadingState message="Caricamento email mancanti..." />
      ) : missingEmails.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            ✅ Nessuna email mancante in questa cartella
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Email Mancanti ({missingEmails.length})</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectAll}
                >
                  {allSelected ? (
                    <>
                      <Square className="h-4 w-4 mr-2" />
                      Deselect All
                    </>
                  ) : (
                    <>
                      <CheckSquare className="h-4 w-4 mr-2" />
                      Select All
                    </>
                  )}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleImportSelected}
                  disabled={selectedCount === 0 || isImporting}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Import Selected ({selectedCount})
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {missingEmails.map((email) => (
                <div
                  key={email.uid}
                  className="flex items-center gap-4 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <Checkbox
                    checked={email.selected}
                    onCheckedChange={() => toggleEmailSelection(email.uid)}
                  />
                  <div className="flex-1 grid grid-cols-[100px_1fr_2fr_200px] gap-4 text-sm">
                    <div className="font-mono text-muted-foreground text-xs">{email.uid}</div>
                    <div className="truncate font-medium">{email.from_name || email.from_email || 'N/A'}</div>
                    <div className="truncate">{email.subject}</div>
                    <div className="text-muted-foreground text-xs">
                      {new Date(email.date).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewEmail(email.uid)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleImportSingle(email.uid, selectedFolder)}
                      disabled={importingUid === email.uid}
                    >
                      <Download className={cn('h-4 w-4', importingUid === email.uid && 'animate-spin')} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Email Detail Overlay */}
      {selectedEmailDetail && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
          <div className="fixed inset-4 z-50 bg-background border rounded-lg shadow-lg overflow-auto">
            <div className="sticky top-0 z-10 bg-background border-b p-4 flex justify-between items-center">
              <div className="font-mono text-sm text-muted-foreground">
                UID: {selectedEmailDetail.uid}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedEmailDetail(null)}
              >
                Chiudi
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Subject</div>
                <div className="text-lg font-semibold">
                  {selectedEmailDetail.subject || selectedEmailDetail.data?.header?.subject || '(No Subject)'}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">From</div>
                <div>
                  {selectedEmailDetail.from_name 
                    ? `${selectedEmailDetail.from_name} <${selectedEmailDetail.from || 'Unknown'}>`
                    : (selectedEmailDetail.from || selectedEmailDetail.data?.header?.from || 'Unknown')
                  }
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Date</div>
                <div>
                  {new Date(selectedEmailDetail.date || selectedEmailDetail.data?.header?.date).toLocaleString('it-IT')}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">Body</div>
                <div className="border rounded-lg p-4 bg-muted/50 max-h-[60vh] overflow-auto">
                  {selectedEmailDetail.body_html || selectedEmailDetail.data?.body_html ? (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: selectedEmailDetail.body_html || selectedEmailDetail.data?.body_html
                      }}
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap font-sans">
                      {selectedEmailDetail.body_text || selectedEmailDetail.text || selectedEmailDetail.data?.body_plain || '(No content)'}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ FASE 2: Dialog rinominazione cartella */}
      <AlertDialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rinomina cartella orfana</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                La cartella <strong>{orphanFolderToRename?.name}</strong> non esiste più sul server.
              </p>
              <p>
                Contiene <strong>{orphanFolderToRename?.count} email</strong> nel database locale.
              </p>
              <p className="text-sm text-muted-foreground">
                Inserisci il nuovo nome della cartella dal server:
              </p>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Es: INBOX/Nuovo Nome"
                className="w-full p-2 border rounded-md bg-background"
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setNewFolderName('');
              setOrphanFolderToRename(null);
            }}>
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (orphanFolderToRename && newFolderName.trim()) {
                  handleRenameFolder(orphanFolderToRename.name, newFolderName.trim());
                  setRenameDialogOpen(false);
                  setNewFolderName('');
                  setOrphanFolderToRename(null);
                }
              }}
              disabled={!newFolderName.trim()}
            >
              Conferma rinominazione
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
