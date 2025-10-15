import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { emailFolderApi } from '@/lib/tmwe-api-integrated';

export interface FolderStat {
  folder: string;
  dbCount: number;
  serverTotal: number;
  missing: number;
  syncPercentage: number;
  isFullySynced: boolean;
}

export const useEmailStats = (folders: any[], userEmail: string) => {
  return useQuery({
    queryKey: ['email-stats', userEmail, folders.map(f => f.name)],
    queryFn: async (): Promise<FolderStat[]> => {
      if (!userEmail || folders.length === 0) {
        return [];
      }

      const stats = await Promise.all(
        folders.map(async (folder) => {
          try {
            // Count in DB
            const { count: dbCount } = await supabase
              .from('email_messages')
              .select('*', { count: 'exact', head: true })
              .eq('cartella', folder.name)
              .eq('user_email', userEmail);

            // Total on server
            const serverTotal = folder.messages || 0;
            const missing = Math.max(0, serverTotal - (dbCount || 0));
            const syncPercentage = serverTotal > 0 ? ((dbCount || 0) / serverTotal) * 100 : 100;

            return {
              folder: folder.name,
              dbCount: dbCount || 0,
              serverTotal,
              missing,
              syncPercentage,
              isFullySynced: syncPercentage >= 98,
            };
          } catch (error) {
            console.error(`Error fetching stats for folder ${folder.name}:`, error);
            return {
              folder: folder.name,
              dbCount: 0,
              serverTotal: folder.messages || 0,
              missing: folder.messages || 0,
              syncPercentage: 0,
              isFullySynced: false,
            };
          }
        })
      );

      return stats;
    },
    enabled: !!userEmail && folders.length > 0,
    refetchInterval: 5000, // Refresh ogni 5 secondi durante il download
  });
};
