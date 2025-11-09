import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook per cache globale user email TMWE
 * ✅ 1 sola query invece di 6+ ripetute
 * ✅ Cache infinita (fino a logout)
 */
export const useUserEmail = () => {
  return useQuery({
    queryKey: ['user-email-tmwe'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non autenticato');
      
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tmwe_email')
        .eq('user_id', user.id)
        .single();
      
      if (!profile?.tmwe_email) throw new Error('Email TMWE non configurata');
      return profile.tmwe_email;
    },
    staleTime: Infinity, // Cache forever (finché non logout)
    retry: 1,
  });
};
