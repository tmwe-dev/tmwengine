/**
 * Hook for fetching folder information from email_search API
 * Optimized to reuse get_emails_metadata response for folder stats
 */
import { useQuery } from '@tanstack/react-query';
import { emailSearchApi } from '@/lib/tmwe-email-search-api';

interface UseEmailFolderInfoParams {
  selectedFolder: string;
}

export const useEmailFolderInfo = ({ selectedFolder }: UseEmailFolderInfoParams) => {
  // === FOLDER STATISTICS FROM get_emails_metadata (REUSING SAME CALL) ===
  const { data: folderStats, isLoading: isLoadingStats, error: statsError } = useQuery({
    queryKey: ['emails-metadata', selectedFolder, 1, 50],
    queryFn: async () => {
      const result = await emailSearchApi.getEmailsMetadata({
        folder: selectedFolder,
        page: 1,
        limit: 50
      });
      
      // Extract folder stats from metadata response
      return {
        total: result?.metadata?.total_messages || 0,
        unread: result?.metadata?.unseen_count || 0,
        flagged: result?.metadata?.flagged_count || 0,
        size_bytes: result?.metadata?.size_bytes || 0,
        folder_name: result?.metadata?.folder_name || selectedFolder,
      };
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!selectedFolder,
  });

  // === GLOBAL EMAIL COUNT (FROM SERVER API) ===
  const { data: globalEmailCount, isLoading: isLoadingGlobal } = useQuery({
    queryKey: ['global-folders-count'],
    queryFn: async () => {
      const foldersResponse = await emailSearchApi.getFolders();
      const folders = foldersResponse?.data || [];
      return folders.reduce((sum: number, f: any) => sum + (f.messages || 0), 0);
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    folderStats,
    globalEmailCount,
    isLoading: isLoadingStats || isLoadingGlobal,
    error: statsError,
  };
};
