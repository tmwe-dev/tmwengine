import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DesignLabLogic } from '@/types/design-lab';
import { useToast } from '@/hooks/use-toast';

export const useDesignLabLogic = (componentId: string | null) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: logicRules, isLoading } = useQuery({
    queryKey: ['design-lab-logic', componentId],
    queryFn: async () => {
      if (!componentId) return [];
      
      const { data, error } = await supabase
        .from('design_lab_logic')
        .select('*')
        .eq('component_id', componentId);

      if (error) throw error;
      return data as DesignLabLogic[];
    },
    enabled: !!componentId,
  });

  const createLogic = useMutation({
    mutationFn: async (logic: {
      component_id: string;
      event_type: 'onClick' | 'onChange' | 'onSubmit' | 'onLoad';
      action_type: string;
      action_config: Record<string, any>;
    }) => {
      const { data, error } = await supabase
        .from('design_lab_logic')
        .insert(logic)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['design-lab-logic', componentId] });
      toast({ title: 'Azione configurata' });
    },
    onError: (error) => {
      toast({ 
        title: 'Errore configurazione azione',
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const updateLogic = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DesignLabLogic> & { id: string }) => {
      const { data, error } = await supabase
        .from('design_lab_logic')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['design-lab-logic', componentId] });
      toast({ title: 'Azione aggiornata' });
    },
    onError: (error) => {
      toast({ 
        title: 'Errore aggiornamento azione',
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const deleteLogic = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('design_lab_logic')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['design-lab-logic', componentId] });
      toast({ title: 'Azione eliminata' });
    },
    onError: (error) => {
      toast({ 
        title: 'Errore eliminazione azione',
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  return {
    logicRules,
    isLoading,
    createLogic: createLogic.mutateAsync,
    updateLogic: updateLogic.mutateAsync,
    deleteLogic: deleteLogic.mutateAsync,
  };
};
