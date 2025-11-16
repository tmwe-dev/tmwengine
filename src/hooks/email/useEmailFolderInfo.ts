/**
 * Hook for fetching folder information from email_search API
 * 100% API-driven, no Supabase queries
 */
import { useQuery } from '@tanstack/react-query';
import { emailSearchApi } from '@/lib/tmwe-email-search-api';

interface UseEmailFolderInfoParams {
  selectedFolder: string;
}

export const useEmailFolderInfo = ({ selectedFolder }: UseEmailFolderInfoParams) => {
  // === FOLDER STATISTICS FROM API ===
  const { data: folderStats, isLoading: isLoadingStats, error: statsError } = useQuery({
    queryKey: ['folder-stats-api', selectedFolder],
    queryFn: async () => {
      const result = await emailSearchApi.getFolderInfo(selectedFolder);
      return {
        total: result?.messages || 0,
        unread: result?.unseen || 0,
        flagged: result?.flagged || 0,
        size_bytes: result?.size_bytes || 0,
        folder_name: result?.folder_name || selectedFolder,
      };
    },
    staleTime: 2 * 60 * 1000, // Cache 2 minutes
    enabled: !!selectedFolder,
  });

  // === GLOBAL EMAIL COUNT (FROM SERVER API) ===
  const { data: globalEmailCount, isLoading: isLoadingGlobal } = useQuery({
    queryKey: ['global-folders-count'],
    queryFn: async () => {
      const foldersResponse = await emailSearchApi.getFolders();
      const folders = foldersResponse?.data || [];
      // Sum messages from all folders
      return folders.reduce((sum: number, f: any) => sum + (f.messages || 0), 0);
    },
    staleTime: 5 * 60 * 1000, // Cache 5 minutes
  });

  return {
    folderStats,
    globalEmailCount,
    isLoading: isLoadingStats || isLoadingGlobal,
    error: statsError,
  };
};
