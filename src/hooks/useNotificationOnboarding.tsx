import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useNotificationOnboarding = () => {
  const [shouldShowModal, setShouldShowModal] = useState(false);
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

      // Se non esiste record O onboarding_completed = false, mostra il modal
      const needsOnboarding = !data || !data.onboarding_completed;
      setShouldShowModal(needsOnboarding);
      
      setIsChecking(false);
    } catch (error) {
      console.error('Error in onboarding check:', error);
      setIsChecking(false);
    }
  };

  const markOnboardingCompleted = () => {
    setShouldShowModal(false);
  };

  return { shouldShowModal, isChecking, markOnboardingCompleted };
};
