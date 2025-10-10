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
      console.log('🔍 Caricamento cartelle...');
      const foldersResponse = await emailFolderApi.getFolders();
      
      console.log('📦 Risposta API getFolders:', foldersResponse);
      console.log('📊 Cartelle trovate:', foldersResponse?.data?.length);
      
      // ✅ CORREZIONE: Accesso a .data come nella sidebar
      if (!foldersResponse?.data || !Array.isArray(foldersResponse.data)) {
        console.error('❌ Formato risposta non valido:', foldersResponse);
        throw new Error('Formato risposta cartelle non valido');
      }

      console.log(`✅ Trovate ${foldersResponse.data.length} cartelle`);
      
      // ✅ Mapping diretto senza chiamate extra (come sidebar)
      const foldersWithInfo: FolderInfo[] = foldersResponse.data.map((folder: any) => {
        console.log('📁 Processando:', folder.name, '- Email:', folder.messages || folder.total_messages);
        
        return {
          name: folder.name,
          path: folder.name,
          messageCount: folder.messages || folder.total_messages || 0,
          unreadCount: folder.unseen || folder.unread_messages || 0,
        };
      });

      console.log('✅ Cartelle processate:', foldersWithInfo.length);
      setFolders(foldersWithInfo);
      
    } catch (err: any) {
      console.error('❌ Errore caricamento cartelle:', err);
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
