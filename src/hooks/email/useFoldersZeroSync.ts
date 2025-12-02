import { useQuery } from '@tanstack/react-query';
import { emailSearchApi } from '@/lib/tmwe-email-search-api';

/**
 * 🆕 ZERO-SYNC Hook: Fetch folders exclusively from TMWE API
 * No local DB fallback - API is the source of truth
 */
export const useFoldersZeroSync = () => {
  return useQuery({
    queryKey: ['folders-zerosync'],
    queryFn: async () => {
      console.log('🌐 [useFoldersZeroSync] Fetching folders from TMWE API...');
      const response = await emailSearchApi.getFolders({ include_counts: true });
      
      if (!response?.folders) {
        console.warn('⚠️ [useFoldersZeroSync] No folders returned from API');
        return [];
      }
      
      const folders = response.folders.map((f: any) => ({
        name: f.folder_name || f.name,
        display_name: f.display_name || f.folder_name || f.name,
        unread_count: f.unread_count || 0,
        total_count: f.total_count || f.message_count || 0
      }));
      
      console.log('✅ [useFoldersZeroSync] Loaded', folders.length, 'folders');
      return folders;
    },
    staleTime: 60000, // 1 minute cache
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};
