import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useRadioAuth = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUser(user);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setCurrentUser(session.user);
          return;
        }

        // Dev/bypass mode: set anonymous user instead of blocking
        console.log('📻 Radio Chat: no auth session, using dev-anonymous mode');
        setCurrentUser({ id: 'dev-anonymous', email: 'dev@local' });
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  return { currentUser, isAuthenticated: !!currentUser, isLoading };
};
