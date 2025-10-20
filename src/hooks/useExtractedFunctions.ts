import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ExtractedFunction } from '@/types/design-lab-scanner';

export const useExtractedFunctions = (componentId?: string) => {
  const { data: functions, isLoading } = useQuery({
    queryKey: ['extracted-functions', componentId],
    queryFn: async () => {
      let query = supabase
        .from('design_lab_extracted_functions')
        .select('*')
        .order('created_at', { ascending: false });

      if (componentId) {
        query = query.eq('component_id', componentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ExtractedFunction[];
    },
  });

  return {
    functions,
    isLoading,
  };
};
