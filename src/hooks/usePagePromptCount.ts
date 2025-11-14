import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const usePagePromptCount = (pageRoute: string) => {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPromptCount();
  }, [pageRoute]);

  const loadPromptCount = async () => {
    try {
      setLoading(true);

      // Count page-specific prompts
      const { count: pageCount, error: pageError } = await (supabase as any)
        .from('chat_laboratory_composed_prompts')
        .select('*', { count: 'exact', head: true })
        .eq('page_route', pageRoute);

      if (pageError) throw pageError;

      // Count global prompts (page_route = null)
      const { count: globalCount, error: globalError } = await (supabase as any)
        .from('chat_laboratory_composed_prompts')
        .select('*', { count: 'exact', head: true })
        .is('page_route', null);

      if (globalError) throw globalError;

      setCount((pageCount || 0) + (globalCount || 0));
    } catch (error) {
      console.error('Error loading prompt count:', error);
      setCount(0);
    } finally {
      setLoading(false);
    }
  };

  return { count, loading };
};
