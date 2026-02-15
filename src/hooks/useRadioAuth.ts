import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useRadioAuth = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Try getUser first
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUser(user);
          return;
        }

        // Fallback: try getSession (useful with auth bypass)
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setCurrentUser(session.user);
          return;
        }

        // No user found
        setCurrentUser(null);
        toastRef.current({
          title: "⚠️ Non autenticato",
          description: "Devi essere loggato per usare Radio Chat",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []); // No toast dependency

  return { currentUser, isAuthenticated: !!currentUser, isLoading };
};
