import { useQuery } from '@tanstack/react-query';
import { emailSearchApi } from '@/lib/tmwe-email-search-api';

/**
 * Hook per ottenere il conteggio globale delle email da tutte le cartelle
 * Cache di 5 minuti per evitare chiamate eccessive
 */
export const useGlobalEmailCount = () => {
  const { data: folders, isLoading, error } = useQuery({
    queryKey: ['global-email-count'],
    queryFn: async () => {
      const response = await emailSearchApi.getFolders();
      return response.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minuti
    gcTime: 10 * 60 * 1000, // 10 minuti
  });

  // Calcola il totale sommando i messaggi di tutte le cartelle
  const totalCount = folders?.reduce((sum, folder) => {
    const count = folder.total_messages || folder.messages || folder.message_count || 0;
    return sum + count;
  }, 0) || 0;

  // Logging per debug
  if (folders && folders.length > 0) {
    console.log('📊 Global Email Count:', {
      totalFolders: folders.length,
      totalEmails: totalCount,
      folderBreakdown: folders.map(f => ({
        name: f.folder_name || f.name,
        messages: f.total_messages || f.messages || f.message_count || 0
      }))
    });
  }

  return {
    totalCount,
    isLoading,
    error: error as Error | null,
    folders
  };
};
