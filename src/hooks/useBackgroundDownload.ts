import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

// ============================================
// BACKGROUND DOWNLOAD HOOK
// Gestisce download email in background con polling
// ============================================

interface BackgroundDownloadStatus {
  jobId: string | null;
  status: 'idle' | 'pending' | 'running' | 'completed' | 'error';
  foldersToSync: string[];
  completedFolders: string[];
  currentFolder: string;
  downloadedInFolder: number;
  totalInFolder: number;
  overallDownloaded: number;
  overallTotal: number;
  speed: number;
  eta: number;
  error: string | null;
}

export function useBackgroundDownload() {
  const [status, setStatus] = useState<BackgroundDownloadStatus>({
    jobId: null,
    status: 'idle',
    foldersToSync: [],
    completedFolders: [],
    currentFolder: '',
    downloadedInFolder: 0,
    totalInFolder: 0,
    overallDownloaded: 0,
    overallTotal: 0,
    speed: 0,
    eta: 0,
    error: null
  });

  const pollingIntervalRef = useRef<number | null>(null);
  const isPollingRef = useRef(false);

  // ============================================
  // START DOWNLOAD
  // ============================================
  const startDownload = useCallback(async (
    folders: string[], 
    userEmail: string,
    functionName: string = 'background-email-sync' // ✅ NUOVO parametro con default
  ) => {
    try {
      console.log('🚀 [useBackgroundDownload] Starting download:', { 
        folders, 
        userEmail, 
        functionName // ✅ Log quale funzione viene usata
      });
      
      setStatus(prev => ({
        ...prev,
        status: 'pending',
        foldersToSync: folders,
        error: null
      }));

      // Chiama Edge Function dinamicamente
      const { data, error } = await supabase.functions.invoke(functionName, { // ✅ Usa parametro
        body: { folders, user_email: userEmail }
      });

      console.log(`📡 [useBackgroundDownload] ${functionName} response:`, { data, error });

      if (error) throw error;

      if (!data?.job_id) {
        throw new Error('No job_id returned from Edge Function');
      }

      const jobId = data.job_id;
      console.log('✅ [useBackgroundDownload] Job started:', jobId);

      setStatus(prev => ({
        ...prev,
        jobId,
        status: 'running'
      }));

      // Avvia polling
      startPolling(jobId);

      return { success: true, jobId };
    } catch (error: any) {
      console.error('❌ [useBackgroundDownload] Error starting download:', error);
      setStatus(prev => ({
        ...prev,
        status: 'error',
        error: error.message
      }));
      return { success: false, error: error.message };
    }
  }, []);

  // ============================================
  // POLLING STATUS
  // ============================================
  const startPolling = useCallback((jobId: string) => {
    if (isPollingRef.current) return;

    isPollingRef.current = true;

    pollingIntervalRef.current = window.setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('email_sync_progress')
          .select('*')
          .eq('job_id', jobId)
          .single();

        if (error) {
          console.error('Error fetching job status:', error);
          return;
        }

        if (!data) return;

        // Aggiorna stato locale
        setStatus(prev => ({
          ...prev,
          status: data.status as any,
          foldersToSync: (data.folders_to_sync as string[]) || [],
          completedFolders: (data.completed_folders as string[]) || [],
          currentFolder: data.current_folder || '',
          downloadedInFolder: data.downloaded_in_folder || 0,
          totalInFolder: data.total_in_folder || 0,
          overallDownloaded: data.processed_messages || 0,
          overallTotal: data.total_messages || 0,
          speed: Number(data.speed) || 0,
          eta: data.eta || 0
        }));

        // Stop polling se completato o errore
        if (data.status === 'completed' || data.status === 'error') {
          stopPolling();
        }
      } catch (error) {
        console.error('Error in polling:', error);
      }
    }, 2000); // Poll ogni 2 secondi
  }, []);

  // ============================================
  // STOP POLLING
  // ============================================
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    isPollingRef.current = false;
  }, []);

  // ============================================
  // RESUME JOB (se esiste job_id in storage o parametro)
  // ============================================
  const resumeJob = useCallback((jobId: string) => {
    setStatus(prev => ({ ...prev, jobId }));
    startPolling(jobId);
  }, [startPolling]);

  // ============================================
  // RESET STATUS
  // ============================================
  const reset = useCallback(() => {
    stopPolling();
    setStatus({
      jobId: null,
      status: 'idle',
      foldersToSync: [],
      completedFolders: [],
      currentFolder: '',
      downloadedInFolder: 0,
      totalInFolder: 0,
      overallDownloaded: 0,
      overallTotal: 0,
      speed: 0,
      eta: 0,
      error: null
    });
  }, [stopPolling]);

  // ============================================
  // CLEANUP ON UNMOUNT
  // ============================================
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    status,
    startDownload,
    resumeJob,
    reset,
    isDownloading: status.status === 'running' || status.status === 'pending'
  };
}
