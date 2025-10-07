import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useUserActivities() {
  const [userActivitiesByContact, setUserActivitiesByContact] = useState<Record<string, boolean>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserActivities();
  }, []);

  const loadUserActivities = async () => {
    try {
      setIsLoading(true);
      
      // Ottieni l'utente corrente
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id || null;
      setCurrentUserId(userId);
      
      if (!userId) {
        setIsLoading(false);
        return;
      }

      // Carica tutte le attività assegnate all'utente
      const { data, error } = await supabase
        .from('attivita')
        .select('rubrica_id')
        .eq('assegnato_a', userId)
        .not('rubrica_id', 'is', null);

      if (error) throw error;

      // Crea una mappa di rubrica_id -> true
      const contactMap = (data || []).reduce((acc, activity) => {
        if (activity.rubrica_id) {
          acc[activity.rubrica_id] = true;
        }
        return acc;
      }, {} as Record<string, boolean>);

      setUserActivitiesByContact(contactMap);
    } catch (error) {
      console.error('Error loading user activities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const hasUserActivitiesForContact = (contactId: string): boolean => {
    return userActivitiesByContact[contactId] || false;
  };

  const refreshUserActivities = () => {
    loadUserActivities();
  };

  return {
    currentUserId,
    hasUserActivitiesForContact,
    isLoading,
    refreshUserActivities
  };
}
