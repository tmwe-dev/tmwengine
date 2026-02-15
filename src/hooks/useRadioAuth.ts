import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useRadioAuth = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);
        if (!user) {
          toast({
            title: "⚠️ Non autenticato",
            description: "Devi essere loggato per usare Radio Chat",
            variant: "destructive"
          });
        }
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, [toast]);

  return { currentUser, isAuthenticated: !!currentUser, isLoading };
};
