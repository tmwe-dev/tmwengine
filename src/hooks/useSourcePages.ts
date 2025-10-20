import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SourcePage } from '@/types/design-lab-scanner';

export const useSourcePages = () => {
  const { data: pages, isLoading } = useQuery({
    queryKey: ['design-lab-source-pages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('design_lab_source_pages')
        .select('*')
        .order('scanned_at', { ascending: false });

      if (error) throw error;
      return data as SourcePage[];
    },
  });

  return {
    pages,
    isLoading,
  };
};
