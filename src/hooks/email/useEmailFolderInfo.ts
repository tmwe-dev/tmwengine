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
    globalEmailCount,
    isLoading: isLoadingGlobal,
  };
};
