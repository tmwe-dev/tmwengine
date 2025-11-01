import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { emailFolderApi } from '@/lib/tmwe-api-integrated';
import { toast } from 'sonner';
import { useFolderLocks } from './useFolderLocks';

interface FolderMissing {
  folderName: string;
  serverCount: number;
  dbCount: number;
  missing: number;
}

interface SyncProgress {
  isRunning: boolean;
  folders: Array<{
    name: string;
    status: 'pending' | 'downloading' | 'completed' | 'error';
    progress: number;
    total: number;
    downloaded: number;
    error?: string;
  }>;
  currentFolder: string | null;
}

export function useAutoSyncMissing(userEmail: string | null | undefined) {
  const [syncProgress, setSyncProgress] = useState<SyncProgress>({
    isRunning: false,
    folders: [],
    currentFolder: null,
  });

  const { getLockedFolders } = useFolderLocks(userEmail);

  const syncMissingEmails = async (onComplete?: () => void) => {
    if (!userEmail) {
      toast.error('Email utente non disponibile');
      return;
    }

    try {
      console.log('🔄 [AutoSync] Starting automatic sync...');
      
      // 1. Get server folder counts
      const serverResponse = await emailFolderApi.getFolders({ 
        include_counts: true,
        skipCache: true 
      });
      
      const serverFolders = serverResponse.folders || serverResponse.data || [];
      console.log('🔄 [AutoSync] Server folders:', serverFolders);

      // 2. Get DB counts
      const { data: dbCounts } = await supabase.rpc('get_email_folder_counts', {
        p_user_email: userEmail,
        p_sync_status: 'fun_email_backup'
      });

      const dbCountsMap = (dbCounts || []).reduce((acc: Record<string, number>, row: { cartella: string; count: number }) => {
        acc[row.cartella] = row.count;
        return acc;
      }, {});

      // 3. Identify folders with missing emails
      const foldersWithMissing: FolderMissing[] = serverFolders
        .map((folder: any) => {
          const folderName = folder.name || folder.folder;
          const serverCount = folder.message_count || folder.total_count || 0;
          const dbCount = dbCountsMap[folderName] || 0;
          const missing = Math.max(0, serverCount - dbCount);

          return {
            folderName,
            serverCount,
            dbCount,
            missing
          };
        })
        .filter(f => f.missing > 0);

      console.log('🔄 [AutoSync] Folders with missing emails:', foldersWithMissing);

      // 4. Filter out locked folders
      const lockedFolders = getLockedFolders();
      console.log('🔒 [AutoSync] Locked folders:', lockedFolders);

      const foldersToSync = foldersWithMissing.filter(
        f => !lockedFolders.includes(f.folderName)
      );

      console.log('🔄 [AutoSync] Folders to sync (unlocked):', foldersToSync);

      if (foldersToSync.length === 0) {
        toast.info('Nessuna cartella da sincronizzare', {
          description: lockedFolders.length > 0 
            ? `${lockedFolders.length} cartelle bloccate`
            : 'Tutte le email sono sincronizzate'
        });
        return;
      }

      // 5. Initialize progress tracking
      setSyncProgress({
        isRunning: true,
        folders: foldersToSync.map(f => ({
          name: f.folderName,
          status: 'pending',
          progress: 0,
          total: f.missing,
          downloaded: 0
        })),
        currentFolder: null
      });

      toast.success(`Avvio sincronizzazione`, {
        description: `${foldersToSync.length} cartelle da sincronizzare`
      });

      // 6. Return folders to sync (the actual sync will be handled by QuickEmailDownloader)
      return foldersToSync.map(f => f.folderName);

    } catch (error: any) {
      console.error('❌ [AutoSync] Error:', error);
      toast.error('Errore sincronizzazione', {
        description: error.message
      });
      setSyncProgress({
        isRunning: false,
        folders: [],
        currentFolder: null
      });
      throw error;
    }
  };

  const updateFolderProgress = (folderName: string, progress: number, total: number, downloaded: number) => {
    setSyncProgress(prev => ({
      ...prev,
      currentFolder: folderName,
      folders: prev.folders.map(f =>
        f.name === folderName
          ? { ...f, status: 'downloading', progress, total, downloaded }
          : f
      )
    }));
  };

  const completeFolderSync = (folderName: string) => {
    setSyncProgress(prev => ({
      ...prev,
      folders: prev.folders.map(f =>
        f.name === folderName
          ? { ...f, status: 'completed', progress: f.total, downloaded: f.total }
          : f
      )
    }));
  };

  const errorFolderSync = (folderName: string, error: string) => {
    setSyncProgress(prev => ({
      ...prev,
      folders: prev.folders.map(f =>
        f.name === folderName
          ? { ...f, status: 'error', error }
          : f
      )
    }));
  };

  const completeSyncProcess = () => {
    setSyncProgress({
      isRunning: false,
      folders: [],
      currentFolder: null
    });
  };

  return {
    syncMissingEmails,
    syncProgress,
    updateFolderProgress,
    completeFolderSync,
    errorFolderSync,
    completeSyncProcess,
    isSyncing: syncProgress.isRunning
  };
}
