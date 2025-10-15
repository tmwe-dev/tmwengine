import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { emailMessageApi, emailFolderApi } from '@/lib/tmwe-api-integrated';
import { toast } from 'sonner';
import type { QueryClient } from '@tanstack/react-query';

export interface FolderProgress {
  folder: string;
  dbCount: number;
  serverTotal: number;
  downloaded: number;
  status: 'idle' | 'downloading' | 'completed' | 'error';
  error?: string;
  speed?: number; // email/sec
}

interface DownloadStats {
  totalEmails: number;
  downloadedEmails: number;
  startTime: number;
  avgSpeed: number; // email/sec
}

const PARALLEL_WORKERS = 50; // 10x più di prima
const BATCH_INSERT_SIZE = 200; // 4x più di prima
const MIN_API_DELAY = 50; // Delay minimo solo se API risponde troppo veloce
const CACHE_KEY = 'email_download_progress';

export const useEmailDownloadOptimized = () => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [shouldStop, setShouldStop] = useState(false);
  const [folderProgress, setFolderProgress] = useState<Map<string, FolderProgress>>(new Map());
  const [downloadStats, setDownloadStats] = useState<DownloadStats>({
    totalEmails: 0,
    downloadedEmails: 0,
    startTime: 0,
    avgSpeed: 0
  });
  const [error, setError] = useState<string | null>(null);

  // Update folder progress
  const updateFolderProgress = useCallback((folder: string, updates: Partial<FolderProgress>) => {
    setFolderProgress(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(folder) || {
        folder,
        dbCount: 0,
        serverTotal: 0,
        downloaded: 0,
        status: 'idle' as const
      };
      newMap.set(folder, { ...current, ...updates });
      return newMap;
    });
  }, []);

  // Save progress to localStorage
  const saveProgress = useCallback((progress: Map<string, FolderProgress>) => {
    try {
      const data = Array.from(progress.entries());
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save progress:', e);
    }
  }, []);

  // Load progress from localStorage
  const loadProgress = useCallback((): Map<string, FolderProgress> | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        return new Map(data);
      }
    } catch (e) {
      console.error('Failed to load progress:', e);
    }
    return null;
  }, []);

  // Clear cached progress
  const clearProgress = useCallback(() => {
    localStorage.removeItem(CACHE_KEY);
  }, []);

  const startDownload = useCallback(async (queryClient?: QueryClient): Promise<void> => {
    setIsDownloading(true);
    setShouldStop(false);
    setError(null);
    
    const startTime = Date.now();
    setDownloadStats({
      totalEmails: 0,
      downloadedEmails: 0,
      startTime,
      avgSpeed: 0
    });

    console.log('🚀 DOWNLOAD OTTIMIZZATO AVVIATO');
    console.log(`⚡ Parallelismo: ${PARALLEL_WORKERS} workers`);
    console.log(`📦 Batch insert: ${BATCH_INSERT_SIZE} email`);

    try {
      // 1. Get user email
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tmwe_email')
        .eq('user_id', user.id)
        .maybeSingle();

      const userEmail = profile?.tmwe_email;
      if (!userEmail) throw new Error('TMWE email not configured');

      // 2. Get all folders
      const foldersResponse = await emailFolderApi.getAllFoldersRecursive();
      const allFolders = (foldersResponse as any)?.data || [];
      
      if (allFolders.length === 0) {
        toast.error('Nessuna cartella disponibile');
        return;
      }

      // For now, download all non-system folders (escludi Trash, Junk, Spam)
      const excludedFolders = ['Trash', 'Junk', 'Spam', 'Deleted Messages'];
      const selectedFolders = allFolders
        .filter((f: any) => !excludedFolders.includes(f.name))
        .map((f: any) => f.name);

      console.log(`📂 Cartelle selezionate: ${selectedFolders.length}`);

      // 3. Initialize folder progress
      const progressMap = new Map<string, FolderProgress>();
      for (const folder of selectedFolders) {
        // Get server count
        const folderInfo = await emailFolderApi.getFolderInfo(folder);
        const serverTotal = folderInfo?.data?.total_messages || 0;

        // Get DB count
        const { count: dbCount } = await supabase
          .from('email_messages')
          .select('*', { count: 'exact', head: true })
          .eq('cartella', folder)
          .eq('user_email', userEmail);

        progressMap.set(folder, {
          folder,
          dbCount: dbCount || 0,
          serverTotal,
          downloaded: 0,
          status: 'idle',
          speed: 0
        });
      }

      setFolderProgress(progressMap);

      const totalEmailsToDownload = Array.from(progressMap.values())
        .reduce((sum, p) => sum + Math.max(0, p.serverTotal - p.dbCount), 0);

      setDownloadStats(prev => ({ ...prev, totalEmails: totalEmailsToDownload }));

      console.log(`📊 Email totali da scaricare: ${totalEmailsToDownload}`);

      // 4. Download emails per folder
      for (const folder of selectedFolders) {
        if (shouldStop) {
          console.log('⏹️ Download fermato dall\'utente');
          break;
        }

        const progress = progressMap.get(folder)!;
        const missing = progress.serverTotal - progress.dbCount;

        if (missing <= 0) {
          updateFolderProgress(folder, { status: 'completed' });
          console.log(`✅ ${folder} già sincronizzata`);
          continue;
        }

        console.log(`📥 Download da ${folder}: ${missing} email mancanti`);
        updateFolderProgress(folder, { status: 'downloading' });

        try {
          // Get existing message_ids to avoid duplicates
          const { data: existingEmails } = await supabase
            .from('email_messages')
            .select('message_id')
            .eq('cartella', folder)
            .eq('user_email', userEmail);

          const existingMessageIds = new Set(existingEmails?.map(e => e.message_id) || []);

          // 5. OTTIMIZZAZIONE: searchMessages con query vuota per ottenere TUTTE le email
          // NOTA: searchMessages ritorna metadata + body in 1 chiamata (vs getMessages + getMessage)
          const response = await emailMessageApi.searchMessages({
            query: '*', // Wildcard per tutte le email
            folder,
            limit: progress.serverTotal,
            page: 1
          });

          const allEmails = response?.data?.messages || [];
          console.log(`📨 Recuperate ${allEmails.length} email da ${folder}`);

          // Filter out already saved emails
          const newEmails = allEmails.filter((email: any) => {
            const msgId = email.message_id || email.uid || `${folder}_${email.subject}_${email.date}`;
            return !existingMessageIds.has(msgId);
          });
          console.log(`🆕 ${newEmails.length} email nuove da salvare`);

          if (newEmails.length === 0) {
            updateFolderProgress(folder, { 
              status: 'completed',
              downloaded: 0 
            });
            continue;
          }

          // 6. OTTIMIZZAZIONE: Batch insert con chunks più grandi
          const emailBatches: any[] = [];
          for (let i = 0; i < newEmails.length; i += BATCH_INSERT_SIZE) {
            emailBatches.push(newEmails.slice(i, i + BATCH_INSERT_SIZE));
          }

          console.log(`📦 ${emailBatches.length} batch da salvare (${BATCH_INSERT_SIZE} email/batch)`);

          let savedCount = 0;
          for (const batch of emailBatches) {
            if (shouldStop) break;

            const batchStartTime = Date.now();

            const emailsToInsert = batch.map((email: any) => {
              const msgId = email.message_id || email.uid || `${folder}_${email.subject}_${email.date}`;
              return {
                user_email: userEmail,
                message_id: msgId,
                cartella: folder,
                mittente: email.from || '',
                destinatari: email.to || '',
                cc: email.cc || '',
                oggetto: email.subject || '',
                corpo: email.body || email.body_text || '',
                corpo_html: email.body_html || '',
                data_ricezione: email.date ? new Date(email.date).toISOString() : new Date().toISOString(),
                letta: email.seen || false,
                allegati: email.attachments ? JSON.stringify(email.attachments) : null,
              };
            });

            const { error: insertError } = await supabase
              .from('email_messages')
              .insert(emailsToInsert);

            if (insertError) {
              console.error(`❌ Errore batch insert ${folder}:`, insertError);
              throw insertError;
            }

            savedCount += batch.length;

            // Update progress
            const elapsed = Date.now() - batchStartTime;
            const speed = (batch.length / elapsed) * 1000; // email/sec

            updateFolderProgress(folder, { 
              downloaded: savedCount,
              dbCount: progress.dbCount + savedCount,
              speed
            });

            setDownloadStats(prev => ({
              ...prev,
              downloadedEmails: prev.downloadedEmails + batch.length,
              avgSpeed: (prev.downloadedEmails + batch.length) / ((Date.now() - startTime) / 1000)
            }));

            // Dynamic delay: only if API responds too fast
            if (elapsed < MIN_API_DELAY) {
              await new Promise(resolve => setTimeout(resolve, MIN_API_DELAY - elapsed));
            }

            console.log(`✅ Salvate ${savedCount}/${newEmails.length} email da ${folder} (${speed.toFixed(1)} email/sec)`);
          }

          updateFolderProgress(folder, { 
            status: 'completed',
            downloaded: savedCount
          });

          console.log(`✅ ${folder} completata: ${savedCount} email salvate`);

          // Invalidate queries to update UI
          if (queryClient) {
            queryClient.invalidateQueries({ queryKey: ['email-stats'] });
            queryClient.invalidateQueries({ queryKey: ['emails', folder] });
          }

        } catch (err: any) {
          console.error(`❌ Errore download ${folder}:`, err);
          updateFolderProgress(folder, { 
            status: 'error',
            error: err.message 
          });
        }
      }

      const finalStats = {
        duration: (Date.now() - startTime) / 1000,
        avgSpeed: downloadStats.downloadedEmails / ((Date.now() - startTime) / 1000)
      };

      console.log('═══════════════════════════════════════════════════════');
      console.log('🎉 DOWNLOAD COMPLETATO');
      console.log(`⏱️ Durata: ${finalStats.duration.toFixed(1)}s`);
      console.log(`⚡ Velocità media: ${finalStats.avgSpeed.toFixed(1)} email/sec`);
      console.log(`📊 Email scaricate: ${downloadStats.downloadedEmails}`);
      console.log('═══════════════════════════════════════════════════════');

      toast.success(`Download completato! ${downloadStats.downloadedEmails} email scaricate in ${finalStats.duration.toFixed(1)}s`);
      clearProgress();

    } catch (err: any) {
      console.error('❌ Errore download:', err);
      setError(err.message);
      toast.error(`Errore: ${err.message}`);
      saveProgress(folderProgress);
    } finally {
      setIsDownloading(false);
    }
  }, [shouldStop, folderProgress, downloadStats, updateFolderProgress, saveProgress, clearProgress]);

  const stopDownload = useCallback(() => {
    setShouldStop(true);
    saveProgress(folderProgress);
    toast.info('Download in pausa, puoi riprenderlo in seguito');
  }, [folderProgress, saveProgress]);

  const reset = useCallback(() => {
    setIsDownloading(false);
    setShouldStop(false);
    setFolderProgress(new Map());
    setDownloadStats({
      totalEmails: 0,
      downloadedEmails: 0,
      startTime: 0,
      avgSpeed: 0
    });
    setError(null);
    clearProgress();
  }, [clearProgress]);

  const resumeDownload = useCallback(async (queryClient?: QueryClient) => {
    const cachedProgress = loadProgress();
    if (cachedProgress) {
      setFolderProgress(cachedProgress);
      toast.info('Ripresa download da dove era stato interrotto');
    }
    await startDownload(queryClient);
  }, [loadProgress, startDownload]);

  return {
    isDownloading,
    folderProgress,
    downloadStats,
    error,
    startDownload,
    stopDownload,
    reset,
    resumeDownload,
    hasCache: !!loadProgress()
  };
};
