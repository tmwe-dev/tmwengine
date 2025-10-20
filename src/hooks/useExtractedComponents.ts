import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ExtractedComponent } from '@/types/design-lab-scanner';

export const useExtractedComponents = (sourcePageId?: string) => {
  const { data: components, isLoading, refetch } = useQuery({
    queryKey: ['extracted-components', sourcePageId],
    queryFn: async () => {
      let query = supabase
        .from('design_lab_extracted_components')
        .select('*')
        .order('created_at', { ascending: false });

      if (sourcePageId) {
        query = query.eq('source_page_id', sourcePageId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ExtractedComponent[];
    },
  });

  return {
    components,
    isLoading,
    refetch,
  };
};
