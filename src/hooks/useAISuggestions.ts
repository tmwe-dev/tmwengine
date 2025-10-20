import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { DesignLabComponent } from '@/types/design-lab';

interface ComponentSuggestion {
  component_name: string;
  component_type: string;
  ui_category: 'input' | 'button' | 'card' | 'layout' | 'data-display' | 'interactive';
  reason: string;
  priority: 'high' | 'medium' | 'low';
  tags?: string[];
  estimated_complexity?: 'low' | 'medium' | 'high';
}

interface SuggestionsResponse {
  suggestions: ComponentSuggestion[];
  rationale: string;
}

interface SuggestionsParams {
  currentComponents: DesignLabComponent[];
  pageName: string;
  pageDescription?: string;
  userIntent?: string;
}

/**
 * TICKET 7: AI-Powered Component Suggestions
 * Hook for getting intelligent component suggestions using Lovable AI
 */
export const useAISuggestions = () => {
  const getSuggestions = useMutation({
    mutationFn: async ({ 
      currentComponents, 
      pageName, 
      pageDescription, 
      userIntent 
    }: SuggestionsParams): Promise<SuggestionsResponse> => {
      
      // Prepare component data for AI analysis
      const componentsData = currentComponents.map(comp => ({
        component_type: comp.component_type,
        ui_category: comp.extracted_component?.ui_category,
        tags: comp.extracted_component?.tags,
        complexity_level: comp.extracted_component?.complexity_level,
      }));

      const { data, error } = await supabase.functions.invoke('design-lab-suggestions', {
        body: {
          currentComponents: componentsData,
          pageContext: {
            page_name: pageName,
            description: pageDescription,
            total_components: currentComponents.length,
          },
          userIntent,
        },
      });

      if (error) {
        console.error('AI suggestions error:', error);
        throw new Error(error.message || 'Failed to get AI suggestions');
      }

      if (!data || !data.suggestions) {
        throw new Error('Invalid response from AI');
      }

      return data as SuggestionsResponse;
    },
    onError: (error: Error) => {
      if (error.message.includes('Rate limit')) {
        toast.error('Limite di richieste AI raggiunto. Riprova tra poco.');
      } else if (error.message.includes('credits')) {
        toast.error('Crediti AI esauriti. Aggiungi crediti al workspace.');
      } else {
        toast.error('Errore nel generare suggerimenti AI');
      }
      console.error('AI suggestions error:', error);
    },
  });

  return {
    getSuggestions: getSuggestions.mutateAsync,
    isLoading: getSuggestions.isPending,
    suggestions: getSuggestions.data,
    error: getSuggestions.error,
  };
};
