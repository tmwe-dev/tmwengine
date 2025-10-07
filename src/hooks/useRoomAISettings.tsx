import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RoomAISettings {
  enableAI: boolean;
  enableTranslation: boolean;
  enableAutoSpeaker: boolean;
  enableSuggestions: boolean;
  activePrompt: string;
  isUsingStandard: boolean;
}

export const useRoomAISettings = (roomId: string | undefined) => {
  const [settings, setSettings] = useState<RoomAISettings>({
    enableAI: false,
    enableTranslation: false,
    enableAutoSpeaker: false,
    enableSuggestions: false,
    activePrompt: '',
    isUsingStandard: true,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!roomId) {
      setIsLoading(false);
      return;
    }

    loadSettings();

    // Real-time subscription per aggiornamenti
    const channel = supabase
      .channel(`room-ai-settings-${roomId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'intranet_room_ai_prompts',
        filter: `room_id=eq.${roomId}`
      }, () => {
        loadSettings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const loadSettings = async () => {
    if (!roomId) return;

    try {
      setIsLoading(true);

      // Carica prompt standard
      const { data: globalData } = await supabase
        .from('intranet_global_ai_prompt')
        .select('prompt_contenuto')
        .eq('attivo', true)
        .maybeSingle();

      const standardPrompt = globalData?.prompt_contenuto || '';

      // Carica impostazioni specifiche della stanza
      const { data: roomData, error } = await supabase
        .from('intranet_room_ai_prompts')
        .select('*')
        .eq('room_id', roomId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading room AI settings:', error);
        return;
      }

      if (roomData) {
        setSettings({
          enableAI: roomData.enable_ai,
          enableTranslation: roomData.enable_translation,
          enableAutoSpeaker: roomData.enable_auto_speaker,
          enableSuggestions: roomData.enable_suggestions,
          activePrompt: roomData.is_using_standard 
            ? standardPrompt 
            : (roomData.custom_prompt || standardPrompt),
          isUsingStandard: roomData.is_using_standard,
        });
      } else {
        // Default settings se non esiste il record
        setSettings({
          enableAI: true,
          enableTranslation: true,
          enableAutoSpeaker: false,
          enableSuggestions: false,
          activePrompt: standardPrompt,
          isUsingStandard: true,
        });
      }
    } catch (error) {
      console.error('Error loading AI settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return { settings, isLoading, reload: loadSettings };
};
