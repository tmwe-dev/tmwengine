import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useEmailCount() {
  return useQuery({
    queryKey: ['email-count-total'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('email_messages')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 10000,
  });
}
