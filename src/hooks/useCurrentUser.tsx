import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTMWEAuth } from '@/hooks/useTMWEAuth';

export const useCurrentUser = () => {
  const { userEmail, supabaseUserId } = useTMWEAuth();
  const [userId, setUserId] = useState<string | null>(supabaseUserId);

  useEffect(() => {
    if (supabaseUserId) {
      setUserId(supabaseUserId);
    } else if (userEmail) {
      // Fallback: cerca user_id da email
      supabase
        .from('user_profiles')
        .select('user_id')
        .eq('tmwe_email', userEmail)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setUserId(data.user_id);
        });
    }
  }, [userEmail, supabaseUserId]);

  return { userId, userEmail };
};
