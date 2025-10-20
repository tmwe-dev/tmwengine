import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DesignLabComponent } from '@/types/design-lab';
import { useToast } from '@/hooks/use-toast';

export const useDesignLabComponents = (pageId: string | null) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: components, isLoading } = useQuery({
    queryKey: ['design-lab-components', pageId],
    queryFn: async () => {
      if (!pageId) return [];
      
      const { data, error } = await supabase
        .from('design_lab_components')
        .select('*')
        .eq('page_id', pageId)
        .order('order_index');

      if (error) throw error;
      return data as DesignLabComponent[];
    },
    enabled: !!pageId,
  });

  const createComponent = useMutation({
    mutationFn: async (component: {
      page_id: string;
      component_type: string;
      props?: any;
      position: { x: number; y: number; width: number; height: number };
      parent_id?: string;
      order_index?: number;
    }) => {
      const { data, error } = await supabase
        .from('design_lab_components')
        .insert({
          page_id: component.page_id,
          component_type: component.component_type,
          props: component.props || {},
          position: component.position,
          parent_id: component.parent_id,
          order_index: component.order_index || 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['design-lab-components', pageId] });
      toast({ title: 'Componente aggiunto' });
    },
    onError: (error) => {
      toast({ 
        title: 'Errore aggiunta componente',
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const updateComponent = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DesignLabComponent> & { id: string }) => {
      const { data, error } = await supabase
        .from('design_lab_components')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['design-lab-components', pageId] });
    },
    onError: (error) => {
      toast({ 
        title: 'Errore aggiornamento componente',
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const deleteComponent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('design_lab_components')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['design-lab-components', pageId] });
      toast({ title: 'Componente eliminato' });
    },
    onError: (error) => {
      toast({ 
        title: 'Errore eliminazione componente',
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const batchUpdatePositions = useMutation({
    mutationFn: async (updates: Array<{ id: string; position: any; order_index?: number }>) => {
      const promises = updates.map(({ id, position, order_index }) =>
        supabase
          .from('design_lab_components')
          .update({ position, ...(order_index !== undefined && { order_index }) })
          .eq('id', id)
      );

      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) {
        throw new Error(`${errors.length} aggiornamenti falliti`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['design-lab-components', pageId] });
    },
    onError: (error) => {
      toast({ 
        title: 'Errore batch update',
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  return {
    components,
    isLoading,
    createComponent: createComponent.mutateAsync,
    updateComponent: updateComponent.mutateAsync,
    deleteComponent: deleteComponent.mutateAsync,
    batchUpdatePositions: batchUpdatePositions.mutateAsync,
  };
};
