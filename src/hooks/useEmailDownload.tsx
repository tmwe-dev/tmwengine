import { useState, useCallback } from 'react';
import { emailMessageApi, emailFolderApi } from '@/lib/tmwe-api-integrated';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { QueryClient } from '@tanstack/react-query';

export const useEmailDownload = () => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadedCount, setDownloadedCount] = useState(0);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [allEmails, setAllEmails] = useState<any[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string>('');
  const [totalToDownload, setTotalToDownload] = useState(0);

  const startDownload = useCallback(async (queryClient?: QueryClient): Promise<void> => {
    setIsDownloading(true);
    setDownloadedCount(0);
    setDownloadError(null);
    setAllEmails([]);
    setCurrentFolder('');
    setTotalToDownload(0);

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
      toast.info('Caricamento cartelle...');
      const foldersResponse = await emailFolderApi.getFolders();
      const folders = foldersResponse?.folders || [];
      
      if (folders.length === 0) {
        toast.error('Nessuna cartella trovata');
        setIsDownloading(false);
        return;
      }

      console.log(`📁 Trovate ${folders.length} cartelle da sincronizzare`);

      let globalDownloadedCount = 0;
      let globalTotalEmails = 0;
      const allDownloadedEmails: any[] = [];
      const folderResults: { folder: string; downloaded: number; errors: number }[] = [];

      // 2. Per ogni cartella, scarica le email
      for (const folderInfo of folders) {
        const folderName = folderInfo.name;
        const folderTotalEmails = folderInfo.total_count || 0;
        
        setCurrentFolder(folderName);
        globalTotalEmails += folderTotalEmails;
        setTotalToDownload(globalTotalEmails);

        console.log(`\n📂 Elaborazione cartella: ${folderName} (${folderTotalEmails} email)`);
        toast.info(`Scaricamento da ${folderName}... (${folderTotalEmails} email)`);

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
              const response = await emailMessageApi.getMessages({
                folder: folderName,
                limit: batchSize,
                page,
              });

              const pageEmails = response?.messages || [];
              
              // Filtra solo email nuove
              const missingEmails = pageEmails.filter((email: any) => {
                const emailId = String(email.uid || email.message_id);
                return !existingIds.has(emailId);
              });

              console.log(`📄 ${folderName} - Pagina ${page}/${totalPages}: ${pageEmails.length} dalla API, ${missingEmails.length} nuove`);

              // Salva email nuove
              if (missingEmails.length > 0) {
                try {
                  const emailsToInsert = missingEmails.map((email: any) => {
                    let isoDate = new Date().toISOString();
                    if (email.date) {
                      try {
                        isoDate = new Date(email.date).toISOString();
                      } catch (e) {
                        console.error('Error parsing date:', email.date);
                      }
                    }

                    return {
                      message_id: String(email.uid || email.message_id || `msg-${Date.now()}-${Math.random()}`),
                      from_email: email.from || email.from_email || '',
                      to_email: email.to || email.to_email || '',
                      cc_email: email.cc || email.cc_email || null,
                      bcc_email: email.bcc || email.bcc_email || null,
                      subject: email.subject || '',
                      body_text: email.body_text || email.text || '',
                      body_html: email.body_html || email.html || '',
                      data_ricezione: isoDate,
                      cartella: folderName,
                      direzione: 'inbound',
                      stato: 'nuovo',
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
                  } else {
                    folderNewEmailsCount += missingEmails.length;
                    globalDownloadedCount += missingEmails.length;
                    allDownloadedEmails.push(...missingEmails);
                    
                    missingEmails.forEach((email: any) => {
                      existingIds.add(String(email.uid || email.message_id));
                    });
                    
                    setDownloadedCount(globalDownloadedCount);
                    setAllEmails([...allDownloadedEmails]);
                    console.log(`✅ ${folderName}: salvate ${missingEmails.length} email (totale cartella: ${folderNewEmailsCount})`);
                  }
                } catch (dbError) {
                  console.error(`❌ ${folderName}: errore database:`, dbError);
                  folderErrors++;
                }
              }

              // Delay tra batch
              if (page < totalPages) {
                await new Promise(resolve => setTimeout(resolve, 100));
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
      toast.error('Errore durante il download delle email');
    }
  }, []);

  const reset = useCallback(() => {
    setIsDownloading(false);
    setDownloadedCount(0);
    setDownloadError(null);
    setAllEmails([]);
  }, []);

  return {
    isDownloading,
    downloadedCount,
    downloadError,
    allEmails,
    startDownload,
    reset,
    currentFolder,
    totalToDownload,
  };
};
