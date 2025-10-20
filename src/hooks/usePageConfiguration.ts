import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { DesignLabComponent } from '@/types/design-lab';

interface PageConfiguration {
  id: string;
  page_id: string;
  source_page_id?: string;
  component_mappings: Record<string, any>;
  function_bindings: Record<string, any>;
  validation_rules: Record<string, any>;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface SaveConfigurationParams {
  pageId: string;
  components: DesignLabComponent[];
  sourcePageId?: string;
  metadata?: Record<string, any>;
}

/**
 * TICKET 6: Page Configuration Persistence
 * Hook for managing design lab page configurations in database
 */
export const usePageConfiguration = (pageId?: string) => {
  const queryClient = useQueryClient();

  // Load existing configuration
  const { data: configuration, isLoading } = useQuery({
    queryKey: ['page-configuration', pageId],
    queryFn: async () => {
      if (!pageId) return null;

      const { data, error } = await supabase
        .from('design_lab_page_configurations')
        .select('*')
        .eq('page_id', pageId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as PageConfiguration | null;
    },
    enabled: !!pageId,
  });

  // Save or update configuration
  const saveConfiguration = useMutation({
    mutationFn: async ({ pageId, components, sourcePageId, metadata = {} }: SaveConfigurationParams) => {
      // Build component mappings from current canvas state
      const componentMappings = components.reduce((acc, comp) => {
        acc[comp.id] = {
          extracted_component_id: comp.extracted_component?.id,
          component_type: comp.component_type,
          props: comp.props,
          position: comp.position,
          order_index: comp.order_index,
        };
        return acc;
      }, {} as Record<string, any>);

      // Extract function bindings from component logics
      const functionBindings: Record<string, any> = {};
      
      // Build validation rules based on component types
      const validationRules = {
        required_components: components
          .filter(c => c.extracted_component?.tags?.includes('required'))
          .map(c => c.id),
        layout_constraints: {
          min_width: 320,
          max_width: 1920,
          snap_to_grid: true,
          grid_size: 8,
        },
      };

      // Enhanced metadata with intelligence
      const enhancedMetadata = {
        ...metadata,
        total_components: components.length,
        component_types: [...new Set(components.map(c => c.component_type))],
        ui_categories: [...new Set(components.map(c => c.extracted_component?.ui_category).filter(Boolean))],
        complexity_levels: components.reduce((acc, c) => {
          const level = c.extracted_component?.complexity_level;
          if (level) acc[level] = (acc[level] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        tags: [...new Set(components.flatMap(c => c.extracted_component?.tags || []))],
        last_modified: new Date().toISOString(),
      };

      // Check if configuration exists
      const { data: existing } = await supabase
        .from('design_lab_page_configurations')
        .select('id')
        .eq('page_id', pageId)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('design_lab_page_configurations')
          .update({
            component_mappings: componentMappings,
            function_bindings: functionBindings,
            validation_rules: validationRules,
            metadata: enhancedMetadata,
            source_page_id: sourcePageId,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('design_lab_page_configurations')
          .insert({
            page_id: pageId,
            source_page_id: sourcePageId,
            component_mappings: componentMappings,
            function_bindings: functionBindings,
            validation_rules: validationRules,
            metadata: enhancedMetadata,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-configuration', pageId] });
      toast.success('Configurazione salvata con successo');
    },
    onError: (error: Error) => {
      console.error('Error saving configuration:', error);
      toast.error('Errore nel salvataggio della configurazione');
    },
  });

  // Auto-save with debounce helper
  const autoSave = async (components: DesignLabComponent[], sourcePageId?: string) => {
    if (!pageId) return;
    
    try {
      await saveConfiguration.mutateAsync({
        pageId,
        components,
        sourcePageId,
        metadata: {
          auto_saved: true,
          saved_at: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  return {
    configuration,
    isLoading,
    saveConfiguration: saveConfiguration.mutateAsync,
    autoSave,
    isSaving: saveConfiguration.isPending,
  };
};
