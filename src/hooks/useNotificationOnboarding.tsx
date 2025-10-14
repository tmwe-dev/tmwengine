import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export const useNotificationOnboarding = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [shouldShowOnboarding, setShouldShowOnboarding] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsChecking(false);
        return;
      }

      // Controlla se l'onboarding è stato completato
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('onboarding_completed')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking onboarding status:', error);
        setIsChecking(false);
        return;
      }

      // Se non esiste record O onboarding_completed = false, mostra l'onboarding
      const needsOnboarding = !data || !data.onboarding_completed;
      setShouldShowOnboarding(needsOnboarding);
      
      setIsChecking(false);
    } catch (error) {
      console.error('Error in onboarding check:', error);
      setIsChecking(false);
    }
  };

  return { shouldShowOnboarding, isChecking };
};
