import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Plugin } from '@/types/design-lab-scanner';

export const usePlugins = (category?: string) => {
  const { data: plugins, isLoading } = useQuery({
    queryKey: ['design-lab-plugins', category],
    queryFn: async () => {
      let query = supabase
        .from('design_lab_plugins')
        .select('*')
        .order('usage_count', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Plugin[];
    },
  });

  return {
    plugins,
    isLoading,
  };
};
