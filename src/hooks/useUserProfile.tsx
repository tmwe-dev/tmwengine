import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  id: string;
  userId: string;
  displayName: string | null;
  preferredLanguage: string;
  readingLanguage: string;
  writingLanguage: string;
  translationMode: 'none' | 'read_only' | 'write_only' | 'both' | 'dual_view';
  autoTranslateWriting: boolean;
  enableAutoSpeaker: boolean;
  preferredCountry: string;
}

export const useUserProfile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProfile();

    // Real-time subscription
    const channel = supabase
      .channel('user-profile-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_profiles'
      }, () => {
        loadProfile();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setProfile(null);
        return;
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading user profile:', error);
        return;
      }

      if (data) {
        setProfile({
          id: data.id,
          userId: data.user_id,
          displayName: data.display_name,
          preferredLanguage: data.preferred_language,
          readingLanguage: data.reading_language,
          writingLanguage: data.writing_language,
          translationMode: data.translation_mode as 'none' | 'read_only' | 'write_only' | 'both' | 'dual_view',
          autoTranslateWriting: data.auto_translate_writing,
          enableAutoSpeaker: data.enable_auto_speaker,
          preferredCountry: data.preferred_country || 'IT',
        });
      } else {
        // Crea profilo di default se non esiste
        await createDefaultProfile(user.id);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createDefaultProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          user_id: userId,
          preferred_language: 'it',
          reading_language: 'it',
          writing_language: 'it',
          translation_mode: 'none',
          auto_translate_writing: false,
          enable_auto_speaker: false,
          preferred_country: 'IT'
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setProfile({
          id: data.id,
          userId: data.user_id,
          displayName: data.display_name,
          preferredLanguage: data.preferred_language,
          readingLanguage: data.reading_language,
          writingLanguage: data.writing_language,
          translationMode: data.translation_mode as 'none' | 'read_only' | 'write_only' | 'both' | 'dual_view',
          autoTranslateWriting: data.auto_translate_writing,
          enableAutoSpeaker: data.enable_auto_speaker,
          preferredCountry: data.preferred_country || 'IT',
        });
      }
    } catch (error) {
      console.error('Error creating default profile:', error);
    }
  };

  const updateProfile = async (updates: Partial<Omit<UserProfile, 'id' | 'userId'>>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user logged in');

      const { error } = await supabase
        .from('user_profiles')
        .update({
          display_name: updates.displayName,
          preferred_language: updates.preferredLanguage,
          reading_language: updates.readingLanguage,
          writing_language: updates.writingLanguage,
          translation_mode: updates.translationMode,
          auto_translate_writing: updates.autoTranslateWriting,
          enable_auto_speaker: updates.enableAutoSpeaker,
          preferred_country: updates.preferredCountry,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      await loadProfile();
      return { success: true };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { success: false, error };
    }
  };

  return { profile, isLoading, updateProfile, reload: loadProfile };
};
