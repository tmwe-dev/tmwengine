import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Activity {
  id: string;
  tipo: 'chiamata' | 'meeting' | 'email' | 'task';
  stato: 'aperta' | 'in_corso' | 'completata' | 'annullata';
  scadenza?: string;
  descrizione: string;
  rubrica_id?: string;
}

export function useCompanyActivities() {
  const [activitiesByCompany, setActivitiesByCompany] = useState<Record<string, Activity[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  const loadActivities = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('attivita')
        .select('id, tipo, stato, scadenza, descrizione, rubrica_id')
        .in('stato', ['aperta', 'in_corso']);

      if (error) throw error;

      // Raggruppa per rubrica_id
      const grouped = (data || []).reduce((acc, activity) => {
        if (activity.rubrica_id) {
          if (!acc[activity.rubrica_id]) {
            acc[activity.rubrica_id] = [];
          }
          acc[activity.rubrica_id].push({
            ...activity,
            tipo: activity.tipo as 'chiamata' | 'meeting' | 'email' | 'task',
            stato: activity.stato as 'aperta' | 'in_corso' | 'completata' | 'annullata'
          });
        }
        return acc;
      }, {} as Record<string, Activity[]>);

      setActivitiesByCompany(grouped);
    } catch (error) {
      console.error('Error loading company activities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, []);

  const getCompanyActivities = (companyId: string): Activity[] => {
    return activitiesByCompany[companyId] || [];
  };

  const hasActivities = (companyId: string): boolean => {
    return (activitiesByCompany[companyId]?.length || 0) > 0;
  };

  const getActivityCount = (companyId: string): number => {
    return activitiesByCompany[companyId]?.length || 0;
  };

  const refreshActivities = () => {
    loadActivities();
  };

  return {
    getCompanyActivities,
    hasActivities,
    getActivityCount,
    isLoading,
    refreshActivities
  };
}