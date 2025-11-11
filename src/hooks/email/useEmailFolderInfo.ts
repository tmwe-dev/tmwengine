/**
 * Hook for fetching folder information and sync status
 * Consolidates multiple queries for email counts and sync status
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { emailSearchApi } from '@/lib/tmwe-email-search-api';

interface UseEmailFolderInfoParams {
  selectedFolder: string;
  isDownloading: boolean;
}

export const useEmailFolderInfo = ({ selectedFolder, isDownloading }: UseEmailFolderInfoParams) => {
  // === EMAIL COUNT FROM SERVER (TMWE API) ===
  const { data: apiEmailCount } = useQuery({
    queryKey: ['api-email-count', selectedFolder],
    queryFn: async () => {
      const result = await emailSearchApi.getEmailsMetadata({ 
        folder: selectedFolder, 
        page: 1,
        limit: 1
      });
      return result?.data?.total || result?.total || 0;
    },
    staleTime: 2 * 60 * 1000, // Cache 2 minutes
  });
  
  const { data: folderInfo } = useQuery({
    queryKey: ['folder-info', selectedFolder],
    queryFn: async () => {
      const result = await emailSearchApi.getFolderInfo(selectedFolder);
      return result;
    },
  });

  // === GLOBAL EMAIL COUNT (FROM SERVER API) ===
  const { data: globalEmailCount } = useQuery({
    queryKey: ['global-folders-count'],
    queryFn: async () => {
      const foldersResponse = await emailSearchApi.getFolders();
      const folders = foldersResponse?.data || [];
      // Sum messages from all folders
      return folders.reduce((sum: number, f: any) => sum + (f.messages || 0), 0);
    },
    staleTime: 5 * 60 * 1000, // Cache 5 minutes
  });

  // === SYNC STATUS: compare API vs DB ===
  const { data: syncStatus } = useQuery({
    queryKey: ['sync-status', selectedFolder],
    queryFn: async () => {
      // 1. Count emails on SERVER (API)
      const apiResponse = await emailSearchApi.getEmailsMetadata({ 
        folder: selectedFolder, 
        page: 1,
        limit: 1
      });
      const apiTotal = apiResponse?.data?.total || apiResponse?.total || 0;

      // 2. Count emails in DB (only for sync comparison)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { apiTotal: 0, dbTotal: 0, missing: 0 };

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tmwe_email')
        .eq('user_id', user.id)
        .single();

      if (!profile?.tmwe_email) return { apiTotal, dbTotal: 0, missing: apiTotal };

      const { count: dbTotal } = await supabase
        .from('email_messages')
        .select('*', { count: 'exact', head: true })
        .eq('cartella', selectedFolder)
        .eq('user_email', profile.tmwe_email);

      const missing = Math.max(0, apiTotal - (dbTotal || 0));

      return { apiTotal, dbTotal: dbTotal || 0, missing };
    },
    refetchInterval: isDownloading ? 3000 : false,
    staleTime: 1 * 60 * 1000, // Cache 1 minute
  });

  const totalEmailCount = syncStatus?.apiTotal || 0;
  const dbEmailCount = syncStatus?.dbTotal || 0;
  const missingEmailCount = syncStatus?.missing || 0;

  return {
    apiEmailCount,
    folderInfo,
    globalEmailCount,
    syncStatus,
    totalEmailCount,
    dbEmailCount,
    missingEmailCount,
  };
};
