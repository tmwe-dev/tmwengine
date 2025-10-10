import { useState, useEffect } from 'react';
import { emailFolderApi } from '@/lib/tmwe-api-integrated';
import { toast } from 'sonner';

export interface FolderInfo {
  name: string;
  path: string;
  messageCount: number;
  unreadCount: number;
}

export const useFolderList = () => {
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFolders = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get all folders
      const foldersResponse = await emailFolderApi.getFolders();
      
      if (!foldersResponse?.folders || !Array.isArray(foldersResponse.folders)) {
        throw new Error('Formato risposta cartelle non valido');
      }

      // Get detailed info for each folder
      const foldersWithInfo: FolderInfo[] = await Promise.all(
        foldersResponse.folders.map(async (folder: any) => {
          try {
            const folderName = typeof folder === 'string' ? folder : folder.name;
            const info = await emailFolderApi.getFolderInfo(folderName);
            
            return {
              name: folderName,
              path: folderName,
              messageCount: info?.total_messages || 0,
              unreadCount: info?.unseen_messages || 0,
            };
          } catch (err) {
            console.error(`Errore recupero info cartella ${folder}:`, err);
            return {
              name: typeof folder === 'string' ? folder : folder.name,
              path: typeof folder === 'string' ? folder : folder.name,
              messageCount: 0,
              unreadCount: 0,
            };
          }
        })
      );

      setFolders(foldersWithInfo);
    } catch (err: any) {
      console.error('Errore caricamento cartelle:', err);
      setError(err.message || 'Errore durante il caricamento delle cartelle');
      toast.error('Errore caricamento cartelle');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFolders();
  }, []);

  return {
    folders,
    loading,
    error,
    reload: loadFolders,
  };
};
