import { useState, useCallback } from 'react';
import { emailMessageApi, emailFolderApi } from '@/lib/tmwe-api-integrated';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { QueryClient } from '@tanstack/react-query';
import { getSyncPreferences, filterFolders, getFilterStats } from '@/lib/email-sync-preferences';

export const useEmailDownload = () => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadedCount, setDownloadedCount] = useState(0);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [allEmails, setAllEmails] = useState<any[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string>('');
  const [totalToDownload, setTotalToDownload] = useState(0);
  const [shouldStop, setShouldStop] = useState(false);
  const [currentFolderProgress, setCurrentFolderProgress] = useState({ current: 0, total: 0 });
  const [currentPhase, setCurrentPhase] = useState<'loading' | 'downloading' | 'saving' | 'idle'>('idle');
  const [processedFolders, setProcessedFolders] = useState<string[]>([]);

  const startDownload = useCallback(async (queryClient?: QueryClient): Promise<void> => {
    setIsDownloading(true);
    setDownloadedCount(0);
    setDownloadError(null);
    setAllEmails([]);
    setCurrentFolder('');
    setTotalToDownload(0);
    setShouldStop(false);
    setCurrentFolderProgress({ current: 0, total: 0 });
    setCurrentPhase('loading');
    setProcessedFolders([]);

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      toast.error('Utente non autenticato');
      setIsDownloading(false);
      return;
    }

    // Get user profile with tmwe_email
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('tmwe_email')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile?.tmwe_email) {
      toast.error('Email TMWE non configurata nel profilo');
      setIsDownloading(false);
      return;
    }

    const userEmail = profile.tmwe_email;

    try {
      // 1. Ottieni la lista di tutte le cartelle
      setCurrentPhase('loading');
      toast.info('Caricamento cartelle...');
      console.log('🔍 Chiamata a emailFolderApi.getFolders()...');
      
      const foldersResponse = await emailFolderApi.getFolders();
      console.log('📦 Risposta API cartelle:', foldersResponse);
      console.log('📦 Tipo risposta:', typeof foldersResponse);
      console.log('📦 Chiavi risposta:', foldersResponse ? Object.keys(foldersResponse) : 'null');
      
      const allFolders = foldersResponse?.data || [];
      console.log(`📁 Cartelle estratte: ${allFolders.length}`, allFolders);
      
      if (allFolders.length === 0) {
        console.error('❌ Nessuna cartella restituita dall\'API');
        console.error('❌ foldersResponse completo:', JSON.stringify(foldersResponse, null, 2));
        toast.error('Nessuna cartella trovata - controlla la console');
        setIsDownloading(false);
        setCurrentPhase('idle');
        return;
      }

      console.log(`📁 Trovate ${allFolders.length} cartelle totali`);

      // 🔍 Applica filtri preferenze utente
      const syncPreferences = await getSyncPreferences(userEmail);
      const folders = filterFolders(allFolders, syncPreferences);
      const stats = getFilterStats(allFolders.length, folders, syncPreferences);
      
      console.log(`🔍 Filtro cartelle applicato:`);
      console.log(`   - Modalità: ${stats.mode === 'whitelist' ? 'Solo selezionate' : 'Tutte eccetto escluse'}`);
      console.log(`   - Totali: ${stats.total}`);
      console.log(`   - Da sincronizzare: ${stats.filtered}`);
      console.log(`   - Escluse: ${stats.excluded}`);
      if (syncPreferences.excluded_folders.length > 0) {
        console.log(`   - Cartelle escluse: ${syncPreferences.excluded_folders.join(', ')}`);
      }
      if (syncPreferences.included_folders.length > 0) {
        console.log(`   - Cartelle incluse: ${syncPreferences.included_folders.join(', ')}`);
      }
      
      toast.info(`📂 ${stats.filtered} cartelle da sincronizzare (${stats.excluded} escluse)`);

      // Calcola il totale di email SUBITO all'inizio
      const globalTotalEmails = folders.reduce((sum, f) => sum + ((f as any).messages || 0), 0);
      setTotalToDownload(globalTotalEmails);
      console.log(`📊 Totale email da scaricare: ${globalTotalEmails}`);

      let globalDownloadedCount = 0;
      const allDownloadedEmails: any[] = [];
      const folderResults: { folder: string; downloaded: number; errors: number }[] = [];
      
      setCurrentPhase('downloading');

      // 2. Per ogni cartella, scarica le email
      for (const folderInfo of folders) {
        // Controlla se deve fermarsi
        if (shouldStop) {
          console.log('🛑 Download interrotto dall\'utente');
          toast.info('Download interrotto');
          setIsDownloading(false);
          return;
        }
        
        const folderName = folderInfo.name;
        const folderTotalEmails = (folderInfo as any).messages || 0;
        
        setCurrentFolder(folderName);
        setCurrentFolderProgress({ current: 0, total: folderTotalEmails });

        console.log(`\n📂 Elaborazione cartella: ${folderName} (${folderTotalEmails} email)`);
        toast.info(`📂 ${folderName} - ${folderTotalEmails} email`);

        if (folderTotalEmails === 0) {
          console.log(`⏭️  Cartella ${folderName} vuota, skip`);
          continue;
        }

        try {
          // Recupera email già presenti per questa cartella
          const { data: existingEmails } = await supabase
            .from('email_messages')
            .select('message_id')
            .eq('cartella', folderName)
            .eq('user_email', userEmail);

          const existingIds = new Set(existingEmails?.map(e => e.message_id) || []);
          const alreadyInDb = existingIds.size;
          
          console.log(`📊 ${folderName}: ${alreadyInDb} email già presenti nel DB`);

          if (alreadyInDb >= folderTotalEmails) {
            console.log(`✅ ${folderName}: tutte le email già scaricate`);
            folderResults.push({ folder: folderName, downloaded: 0, errors: 0 });
            continue;
          }

          const batchSize = 50;
          const totalPages = Math.ceil(folderTotalEmails / batchSize);
          let folderNewEmailsCount = 0;
          let folderErrors = 0;

          // Scarica batch per batch
          for (let page = 1; page <= totalPages; page++) {
            try {
              // Step 1: Ottieni lista UIDs
              const uidListResponse = await emailMessageApi.getMessages({
                folder: folderName,
                limit: batchSize,
                page,
              });

              const uidList = uidListResponse?.messages || [];
              console.log(`📨 ${folderName} - Pagina ${page}/${totalPages}: ricevuti ${uidList.length} UIDs`);

              if (uidList.length === 0) {
                console.log(`⏭️  ${folderName}: nessun UID in questa pagina, fine`);
                break;
              }

              // Step 2: Scarica email complete in parallelo (5 alla volta)
              const PARALLEL_LIMIT = 5;
              const pageEmails = [];
              
              for (let i = 0; i < uidList.length; i += PARALLEL_LIMIT) {
                const batch = uidList.slice(i, i + PARALLEL_LIMIT);
                
                const emails = await Promise.all(
                  batch.map(async (uidInfo: any) => {
                    const uid = String(uidInfo.uid);
                    const messageId = String(uidInfo.message_id || uid);
                    
                    // Skip se già presente
                    if (existingIds.has(messageId)) {
                      return null;
                    }
                    
                    try {
                      const emailIndex = i + batch.indexOf(uidInfo) + 1;
                      console.log(`⬇️  ${folderName}: scaricamento email ${emailIndex}/${uidList.length} (UID: ${uid})...`);
                      
                      // Aggiorna progresso cartella corrente
                      setCurrentFolderProgress({ current: emailIndex, total: uidList.length });
                      
                      const fullEmail = await emailMessageApi.getMessage(uid, false);
                      return fullEmail;
                    } catch (error) {
                      console.error(`❌ ${folderName}: errore scaricamento UID ${uid}:`, error);
                      folderErrors++;
                      return null;
                    }
                  })
                );
                
                pageEmails.push(...emails.filter((e: any) => e !== null));
                
                // Delay tra batch per non sovraccaricare l'API
                if (i + PARALLEL_LIMIT < uidList.length) {
                  await new Promise(resolve => setTimeout(resolve, 200));
                }
              }

              console.log(`🆕 ${folderName} - Pagina ${page}: ${pageEmails.length} email complete scaricate`);

              // Step 3: Salva email complete in Supabase
              if (pageEmails.length > 0) {
                try {
                  setCurrentPhase('saving');
                  const emailsToInsert = pageEmails.map((email: any) => {
                    let isoDate = new Date().toISOString();
                    if (email.date) {
                      try {
                        isoDate = new Date(email.date).toISOString();
                      } catch (e) {
                        console.error('Error parsing date:', email.date);
                      }
                    }

                    return {
                      message_id: String(email.message_id || email.uid || `msg-${Date.now()}-${Math.random()}`),
                      from_email: email.from?.address || email.from || email.from_email || '',
                      to_email: Array.isArray(email.to) 
                        ? email.to.map((t: any) => t.address || t).join(',')
                        : email.to || email.to_email || '',
                      cc_email: email.cc || email.cc_email || null,
                      bcc_email: email.bcc || email.bcc_email || null,
                      subject: email.subject || '',
                      body_text: email.body_text || email.text || '',
                      body_html: email.body_html || email.html || '',
                      data_ricezione: isoDate,
                      cartella: folderName,
                      direzione: 'inbound',
                      stato: email.flags?.includes('\\Seen') ? 'letto' : 'nuovo',
                      flags: email.flags || [],
                      attachments: email.attachments || [],
                      provider_id: '00000000-0000-0000-0000-000000000000',
                      user_email: userEmail,
                    };
                  });

                  const { error: insertError } = await supabase
                    .from('email_messages')
                    .insert(emailsToInsert);

                  if (insertError) {
                    console.error(`❌ ${folderName}: errore salvataggio batch:`, insertError);
                    folderErrors++;
                    setCurrentPhase('downloading');
                  } else {
                    folderNewEmailsCount += pageEmails.length;
                    globalDownloadedCount += pageEmails.length;
                    allDownloadedEmails.push(...pageEmails);
                    
                    pageEmails.forEach((email: any) => {
                      const messageId = String(email.message_id || email.uid);
                      existingIds.add(messageId);
                    });
                    
                    setDownloadedCount(globalDownloadedCount);
                    setAllEmails([...allDownloadedEmails]);
                    setCurrentPhase('downloading');
                    console.log(`✅ ${folderName}: salvate ${pageEmails.length} email complete (totale cartella: ${folderNewEmailsCount})`);
                  }
                } catch (dbError) {
                  console.error(`❌ ${folderName}: errore database:`, dbError);
                  folderErrors++;
                }
              }

              // Delay tra pagine
              if (page < totalPages) {
                await new Promise(resolve => setTimeout(resolve, 300));
              }
            } catch (error) {
              console.error(`❌ ${folderName}: errore pagina ${page}:`, error);
              folderErrors++;
            }
          }

          folderResults.push({ 
            folder: folderName, 
            downloaded: folderNewEmailsCount, 
            errors: folderErrors 
          });

          // Aggiungi alla lista delle cartelle processate
          setProcessedFolders(prev => [...prev, folderName]);

          console.log(`✅ ${folderName}: completato - ${folderNewEmailsCount} nuove email scaricate`);

        } catch (error) {
          console.error(`❌ Errore durante elaborazione cartella ${folderName}:`, error);
          folderResults.push({ folder: folderName, downloaded: 0, errors: 1 });
        }

        // Piccolo delay tra cartelle
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      setIsDownloading(false);
      setCurrentFolder('');
      setCurrentPhase('idle');
      setCurrentFolderProgress({ current: 0, total: 0 });
      
      // Riepilogo finale
      const totalDownloaded = folderResults.reduce((sum, r) => sum + r.downloaded, 0);
      const totalErrors = folderResults.reduce((sum, r) => sum + r.errors, 0);
      const foldersWithNewEmails = folderResults.filter(r => r.downloaded > 0).length;

      console.log(`\n📊 RIEPILOGO FINALE:`);
      console.log(`   - Cartelle elaborate: ${folders.length}`);
      console.log(`   - Cartelle con nuove email: ${foldersWithNewEmails}`);
      console.log(`   - Email scaricate: ${totalDownloaded}`);
      console.log(`   - Errori: ${totalErrors}`);

      if (totalDownloaded > 0) {
        toast.success(
          `Download completato! ${totalDownloaded.toLocaleString()} nuove email da ${foldersWithNewEmails} cartelle.`
        );
      } else {
        toast.success(`Tutte le cartelle sono già sincronizzate.`);
      }

      if (totalErrors > 0) {
        toast.warning(`Completato con ${totalErrors} errori. Controlla la console per dettagli.`);
      }

      // Invalida le query per refreshare la UI
      if (queryClient) {
        queryClient.invalidateQueries({ queryKey: ['messages'] });
        queryClient.invalidateQueries({ queryKey: ['db-email-count'] });
        queryClient.invalidateQueries({ queryKey: ['global-email-count'] });
      }

    } catch (error: any) {
      console.error('❌ Download error:', error);
      setDownloadError(error.message || 'Errore durante il download');
      setIsDownloading(false);
      setCurrentPhase('idle');
      toast.error('Errore durante il download delle email');
    }
  }, [shouldStop]);

  const stopDownload = useCallback(() => {
    setShouldStop(true);
    toast.info('Interruzione download in corso...');
  }, []);

  const reset = useCallback(() => {
    setIsDownloading(false);
    setDownloadedCount(0);
    setDownloadError(null);
    setAllEmails([]);
    setShouldStop(false);
    setCurrentFolderProgress({ current: 0, total: 0 });
    setCurrentPhase('idle');
    setProcessedFolders([]);
  }, []);

  return {
    isDownloading,
    downloadedCount,
    downloadError,
    allEmails,
    startDownload,
    stopDownload,
    reset,
    currentFolder,
    totalToDownload,
    currentFolderProgress,
    currentPhase,
    processedFolders,
  };
};
