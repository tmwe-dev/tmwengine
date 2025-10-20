import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SystemAction } from '@/types/design-lab';

export const useSystemActions = () => {
  const { data: actions, isLoading } = useQuery({
    queryKey: ['system-actions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_actions')
        .select('*')
        .eq('is_functional', true)
        .order('name');

      if (error) throw error;
      return data as SystemAction[];
    },
  });

  return {
    actions,
    isLoading,
  };
};
