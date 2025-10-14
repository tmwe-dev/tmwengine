import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUserProfile } from './useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

export const useLanguage = () => {
  const { i18n } = useTranslation();
  const { profile, updateProfile } = useUserProfile();
  
  // Fetch active languages from database
  const { data: systemLanguages = [] } = useQuery({
    queryKey: ['system-languages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_languages')
        .select('*')
        .eq('is_active', true)
        .order('order_index', { ascending: true });
      
      if (error) {
        console.error('Error fetching system languages:', error);
        return [];
      }
      
      return data.map(lang => ({
        code: lang.code,
        name: lang.name,
        flag: lang.flag
      }));
    }
  });

  // Sincronizza la lingua da user_profiles all'avvio
  useEffect(() => {
    if (profile?.preferredLanguage) {
      const savedLang = profile.preferredLanguage;
      if (i18n.language !== savedLang) {
        i18n.changeLanguage(savedLang);
        localStorage.setItem('preferredLanguage', savedLang);
      }
    }
  }, [profile, i18n]);

  const changeLanguage = async (languageCode: string) => {
    try {
      // Cambia lingua nell'interfaccia
      await i18n.changeLanguage(languageCode);
      localStorage.setItem('preferredLanguage', languageCode);

      // Salva nel database
      if (profile) {
        await updateProfile({ preferredLanguage: languageCode });
      }

      toast.success(
        languageCode === 'it' ? 'Lingua cambiata con successo' :
        languageCode === 'en' ? 'Language changed successfully' :
        languageCode === 'es' ? 'Idioma cambiado con éxito' :
        languageCode === 'fr' ? 'Langue changée avec succès' :
        'Sprache erfolgreich geändert'
      );
    } catch (error) {
      console.error('Error changing language:', error);
      toast.error(
        languageCode === 'it' ? 'Errore nel cambio lingua' :
        languageCode === 'en' ? 'Error changing language' :
        languageCode === 'es' ? 'Error al cambiar idioma' :
        languageCode === 'fr' ? 'Erreur lors du changement de langue' :
        'Fehler beim Sprachwechsel'
      );
    }
  };

  return {
    currentLanguage: i18n.language,
    changeLanguage,
    languages: systemLanguages,
  };
};
