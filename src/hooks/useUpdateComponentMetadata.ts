import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useUpdateComponentMetadata() {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const updateMetadata = async () => {
    setIsUpdating(true);

    try {
      const { data, error } = await supabase.functions.invoke('update-component-metadata');

      if (error) throw error;

      toast({
        title: "Metadata aggiornati!",
        description: data.message || `Aggiornati ${data.updated} componenti`,
      });

      return data;
    } catch (error) {
      toast({
        title: "Errore aggiornamento metadata",
        description: error instanceof Error ? error.message : "Errore sconosciuto",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    updateMetadata,
    isUpdating,
  };
}
