import { useState, useRef, useCallback } from 'react';
import { emailFolderApi, emailMessageApi } from '@/lib/tmwe-api-integrated';
import { useEmailSync } from './useEmailSync';
import { toast } from 'sonner';

export interface FolderSyncStatus {
  name: string;
  totalEmails: number;
  syncedEmails: number;
  status: 'pending' | 'syncing' | 'completed' | 'error';
  error?: string;
}

export interface MultiFolderProgress {
  currentFolder: string;
  currentFolderProgress: number; // 0-100
  overallProgress: number; // 0-100
  foldersProcessed: number;
  totalFolders: number;
  totalEmailsDownloaded: number;
  totalEmailsToSync: number;
  estimatedTimeRemaining: number; // in seconds
}

interface UseMultiFolderSyncOptions {
  excludedFolders?: string[];
  onProgress?: (progress: MultiFolderProgress) => void;
  onFolderComplete?: (folder: FolderSyncStatus) => void;
}

interface MultiFolderSyncResult {
  isSyncing: boolean;
  currentFolder: string | null;
  progress: MultiFolderProgress;
  folderStatuses: FolderSyncStatus[];
  startMultiFolderSync: (selectedFolders: string[]) => Promise<void>;
  stopMultiFolderSync: () => void;
  error: string | null;
}

export const useMultiFolderSync = (options: UseMultiFolderSyncOptions = {}): MultiFolderSyncResult => {
  const { excludedFolders = [], onProgress, onFolderComplete } = options;
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [folderStatuses, setFolderStatuses] = useState<FolderSyncStatus[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<MultiFolderProgress>({
    currentFolder: '',
    currentFolderProgress: 0,
    overallProgress: 0,
    foldersProcessed: 0,
    totalFolders: 0,
    totalEmailsDownloaded: 0,
    totalEmailsToSync: 0,
    estimatedTimeRemaining: 0
  });

  const shouldStop = useRef(false);
  const startTime = useRef<number>(0);
  
  const emailSync = useEmailSync({
    folder: currentFolder || 'INBOX',
    totalEmailCount: 0
  });

  const updateProgress = useCallback((
    currentFolderName: string,
    currentFolderSynced: number,
    currentFolderTotal: number,
    totalSynced: number,
    totalToSync: number,
    foldersProcessed: number,
    totalFolders: number
  ) => {
    const currentFolderProgress = currentFolderTotal > 0 
      ? Math.round((currentFolderSynced / currentFolderTotal) * 100)
      : 0;
    
    const overallProgress = totalToSync > 0
      ? Math.round((totalSynced / totalToSync) * 100)
      : 0;

    // Estimate time remaining based on average speed
    const elapsed = (Date.now() - startTime.current) / 1000; // seconds
    const averageSpeed = totalSynced / elapsed; // emails per second
    const remaining = totalToSync - totalSynced;
    const estimatedTimeRemaining = averageSpeed > 0 
      ? Math.round(remaining / averageSpeed)
      : 0;

    const newProgress: MultiFolderProgress = {
      currentFolder: currentFolderName,
      currentFolderProgress,
      overallProgress,
      foldersProcessed,
      totalFolders,
      totalEmailsDownloaded: totalSynced,
      totalEmailsToSync: totalToSync,
      estimatedTimeRemaining
    };

    setProgress(newProgress);
    onProgress?.(newProgress);
  }, [onProgress]);

  const startMultiFolderSync = useCallback(async (selectedFolders: string[]) => {
    if (isSyncing) return;

    setIsSyncing(true);
    setError(null);
    shouldStop.current = false;
    startTime.current = Date.now();

    try {
      console.log('🚀 Starting multi-folder sync for:', selectedFolders);

      // Filter out excluded folders
      const foldersToSync = selectedFolders.filter(f => !excludedFolders.includes(f));
      
      if (foldersToSync.length === 0) {
        toast.error('Nessuna cartella selezionata per la sincronizzazione');
        setIsSyncing(false);
        return;
      }

      // Initialize folder statuses
      const initialStatuses: FolderSyncStatus[] = [];
      let totalEmailsToSync = 0;

      for (const folderName of foldersToSync) {
        if (shouldStop.current) break;

        try {
          const count = await emailMessageApi.getTotalEmailCount({ folder: folderName });
          initialStatuses.push({
            name: folderName,
            totalEmails: count,
            syncedEmails: 0,
            status: 'pending'
          });
          totalEmailsToSync += count;
        } catch (err) {
          console.error(`Error getting count for folder ${folderName}:`, err);
          initialStatuses.push({
            name: folderName,
            totalEmails: 0,
            syncedEmails: 0,
            status: 'error',
            error: err instanceof Error ? err.message : 'Unknown error'
          });
        }
      }

      setFolderStatuses(initialStatuses);

      let totalEmailsDownloaded = 0;
      let foldersProcessed = 0;

      // Sync each folder
      for (let i = 0; i < initialStatuses.length; i++) {
        if (shouldStop.current) {
          console.log('🛑 Multi-folder sync stopped by user');
          break;
        }

        const folderStatus = initialStatuses[i];
        if (folderStatus.status === 'error' || folderStatus.totalEmails === 0) {
          foldersProcessed++;
          continue;
        }

        setCurrentFolder(folderStatus.name);
        
        // Update status to syncing
        setFolderStatuses(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'syncing' as const } : f
        ));

        console.log(`📁 [${i + 1}/${initialStatuses.length}] Syncing folder: ${folderStatus.name} (${folderStatus.totalEmails} emails)`);

        try {
          // Use useEmailSync for this folder
          await emailSync.startSync();

          // Track progress during sync
          const checkProgress = setInterval(() => {
            const currentSynced = emailSync.syncedCount;
            
            updateProgress(
              folderStatus.name,
              currentSynced,
              folderStatus.totalEmails,
              totalEmailsDownloaded + currentSynced,
              totalEmailsToSync,
              foldersProcessed,
              initialStatuses.length
            );
          }, 500);

          // Wait for sync to complete
          while (emailSync.isSyncing) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            if (shouldStop.current) {
              emailSync.stopSync();
              clearInterval(checkProgress);
              break;
            }
          }

          clearInterval(checkProgress);

          if (shouldStop.current) break;

          const syncedCount = emailSync.syncedCount;
          totalEmailsDownloaded += syncedCount;

          // Update status to completed
          setFolderStatuses(prev => prev.map((f, idx) => 
            idx === i ? { 
              ...f, 
              syncedEmails: syncedCount,
              status: 'completed' as const 
            } : f
          ));

          onFolderComplete?.({
            ...folderStatus,
            syncedEmails: syncedCount,
            status: 'completed'
          });

          foldersProcessed++;
          
          console.log(`✅ Folder ${folderStatus.name} completed: ${syncedCount}/${folderStatus.totalEmails} emails`);

        } catch (err) {
          console.error(`Error syncing folder ${folderStatus.name}:`, err);
          
          setFolderStatuses(prev => prev.map((f, idx) => 
            idx === i ? { 
              ...f, 
              status: 'error' as const,
              error: err instanceof Error ? err.message : 'Unknown error'
            } : f
          ));

          foldersProcessed++;
        }

        // Final progress update for this folder
        updateProgress(
          folderStatus.name,
          folderStatus.totalEmails,
          folderStatus.totalEmails,
          totalEmailsDownloaded,
          totalEmailsToSync,
          foldersProcessed,
          initialStatuses.length
        );
      }

      if (!shouldStop.current) {
        toast.success(`🎉 Sincronizzazione completata! ${totalEmailsDownloaded}/${totalEmailsToSync} email scaricate`);
      } else {
        toast.info(`⏸️ Sincronizzazione interrotta. ${totalEmailsDownloaded}/${totalEmailsToSync} email scaricate`);
      }

    } catch (err) {
      console.error('Multi-folder sync error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Errore sconosciuto';
      setError(errorMsg);
      toast.error(`Errore durante la sincronizzazione: ${errorMsg}`);
    } finally {
      setIsSyncing(false);
      setCurrentFolder(null);
    }
  }, [isSyncing, excludedFolders, emailSync, onProgress, onFolderComplete, updateProgress]);

  const stopMultiFolderSync = useCallback(() => {
    console.log('🛑 Stopping multi-folder sync...');
    shouldStop.current = true;
    emailSync.stopSync();
  }, [emailSync]);

  return {
    isSyncing,
    currentFolder,
    progress,
    folderStatuses,
    startMultiFolderSync,
    stopMultiFolderSync,
    error
  };
};
