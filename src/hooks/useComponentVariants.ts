import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { generateComponentThumbnail } from '@/lib/design-lab/thumbnail-generator';
import { ExtractedComponent } from '@/types/design-lab-scanner';

/**
 * Hook per gestire la creazione di varianti personalizzate di componenti
 */
export const useComponentVariants = () => {
  const queryClient = useQueryClient();

  const createVariant = useMutation({
    mutationFn: async ({
      originalComponentId,
      variantName,
      modifiedProps,
      modifiedJsx,
    }: {
      originalComponentId: string;
      variantName: string;
      modifiedProps: Record<string, any>;
      modifiedJsx?: string;
    }) => {
      // 1. Fetch original component
      const { data: original, error: fetchError } = await supabase
        .from('design_lab_extracted_components')
        .select('*')
        .eq('id', originalComponentId)
        .single();

      if (fetchError || !original) {
        throw new Error('Componente originale non trovato');
      }

      // 2. Create variant record
      const variant = {
        component_name: variantName || `${original.component_name}_Custom`,
        component_type: original.component_type,
        jsx_code: modifiedJsx || original.jsx_code,
        props_schema: modifiedProps as any,
        dependencies: (original.dependencies || []) as any,
        is_reusable: true,
        usage_count: 0,
        source_page_id: original.source_page_id,
      };

      const { data: newVariant, error: insertError } = await supabase
        .from('design_lab_extracted_components')
        .insert([variant])
        .select()
        .single();

      if (insertError || !newVariant) {
        throw new Error('Errore durante la creazione della variante');
      }

      // 3. Generate thumbnail for the variant
      try {
        await generateComponentThumbnail(newVariant.id, newVariant.jsx_code);
      } catch (thumbnailError) {
        console.warn('Thumbnail generation failed, but variant was created:', thumbnailError);
      }

      return newVariant;
    },
    onSuccess: (newVariant) => {
      queryClient.invalidateQueries({ queryKey: ['extracted-components'] });
      toast.success(`Variante "${newVariant.component_name}" creata con successo`);
    },
    onError: (error) => {
      toast.error(`Errore durante la creazione della variante: ${error.message}`);
    },
  });

  return {
    createVariant: createVariant.mutateAsync,
    isCreating: createVariant.isPending,
  };
};
