import { useQuery } from '@tanstack/react-query';
import { emailSearchApi } from '@/lib/tmwe-email-search-api';
import { supabase } from '@/integrations/supabase/client';

/**
 * 🆕 ZERO-SYNC Hook: Fetch folder statistics from TMWE API + local classifications
 * - Email counts: TMWE API (source of truth)
 * - Classifications: Local DB (metadata only)
 */
export const useFolderStatsZeroSync = (folder: string, userEmail?: string) => {
  return useQuery({
    queryKey: ['folder-stats-zerosync', folder, userEmail],
    queryFn: async () => {
      if (!folder) return null;
      
      console.log('📊 [useFolderStatsZeroSync] Fetching stats for folder:', folder);
      
      // 1. Get email statistics from TMWE API
      const apiStats = await emailSearchApi.getStatistics({ folder });
      const totalEmails = apiStats?.data?.total || 0;
      
      // 2. Get classification count from local DB
      let classifiedCount = 0;
      if (userEmail) {
        const { count } = await supabase
          .from('email_ai_classifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_email', userEmail)
          .eq('folder_name', folder);
        
        classifiedCount = count || 0;
      }
      
      const percentage = totalEmails > 0 
        ? Math.round((classifiedCount / totalEmails) * 100) 
        : 0;
      
      console.log('✅ [useFolderStatsZeroSync] Stats:', {
        folder,
        totalEmails,
        classifiedCount,
        percentage
      });
      
      return {
        totalEmails,
        classifiedCount,
        classificationPercentage: percentage
      };
    },
    enabled: !!folder,
    staleTime: 30000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
  });
};
