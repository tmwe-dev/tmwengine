import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DesignLabPage } from '@/types/design-lab';
import { useToast } from '@/hooks/use-toast';

export const useDesignLabPages = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pages, isLoading } = useQuery({
    queryKey: ['design-lab-pages'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('design_lab_pages')
        .select('*')
        .or(`user_id.eq.${user?.id},is_template.eq.true`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DesignLabPage[];
    },
  });

  const createPage = useMutation({
    mutationFn: async (page: { page_name: string; description?: string; is_template?: boolean; config?: any }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('design_lab_pages')
        .insert({
          page_name: page.page_name,
          description: page.description,
          is_template: page.is_template,
          config: page.config,
          user_id: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['design-lab-pages'] });
      toast({ title: 'Pagina creata con successo' });
    },
    onError: (error) => {
      toast({ 
        title: 'Errore nella creazione',
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const updatePage = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DesignLabPage> & { id: string }) => {
      const { data, error } = await supabase
        .from('design_lab_pages')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['design-lab-pages'] });
      toast({ title: 'Pagina aggiornata' });
    },
    onError: (error) => {
      toast({ 
        title: 'Errore nell\'aggiornamento',
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const deletePage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('design_lab_pages')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['design-lab-pages'] });
      toast({ title: 'Pagina eliminata' });
    },
    onError: (error) => {
      toast({ 
        title: 'Errore nell\'eliminazione',
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  return {
    pages,
    isLoading,
    createPage: createPage.mutateAsync,
    updatePage: updatePage.mutateAsync,
    deletePage: deletePage.mutateAsync,
  };
};
