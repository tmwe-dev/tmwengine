import { useRef, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ElevenLabsTTSProps {
  text: string;
  language: string;
  voiceId?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

export const useElevenLabsTTS = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [defaultVoiceId, setDefaultVoiceId] = useState<string | null>(null);

  useEffect(() => {
    const loadDefaultVoiceId = async () => {
      try {
        // Prova a leggere da voice_agent_config
        const { data: config } = await supabase
          .from('voice_agent_config')
          .select('default_voice_id')
          .eq('enabled', true)
          .single();
        
        if (config?.default_voice_id) {
          setDefaultVoiceId(config.default_voice_id);
          return;
        }
        
        // Fallback: primo agent attivo da elevenlabs_agents
        const { data: agents } = await supabase
          .from('elevenlabs_agents')
          .select('voice_id')
          .eq('is_active', true)
          .order('order_index', { ascending: true })
          .limit(1);
        
        if (agents && agents.length > 0) {
          setDefaultVoiceId(agents[0].voice_id);
        }
      } catch (error) {
        console.error('❌ Errore caricamento default voice ID:', error);
      }
    };
    
    loadDefaultVoiceId();
  }, []);

  const speak = async ({
    text,
    language,
    voiceId,
    onStart,
    onEnd,
    onError
  }: ElevenLabsTTSProps) => {
    try {
      // Stop audio precedente se in corso
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      setIsSpeaking(true);
      onStart?.();

      // Seleziona voice ID: priorità a voiceId prop, poi DB, poi fallback
      const selectedVoiceId = voiceId || defaultVoiceId || '9BWtsMINqrJLrRacOk9x';
      
      if (!selectedVoiceId) {
        console.warn('⚠️ Nessun voice ID configurato in voice_agent_config o elevenlabs_agents');
      }

      console.log('🎙️ ElevenLabs TTS Request:', {
        text: text.substring(0, 50) + '...',
        language,
        voiceId: selectedVoiceId
      });

      // Chiamata edge function
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: {
          text,
          voice_id: selectedVoiceId,
          model_id: 'eleven_turbo_v2_5' // Supporta 32 lingue incluso Thai
        }
      });

      if (error) throw error;
      if (!data?.audio) throw new Error('No audio data received');

      console.log('✅ Audio ricevuto, inizio riproduzione');

      // Converti base64 -> blob -> URL
      const audioBlob = await fetch(`data:audio/mpeg;base64,${data.audio}`).then(r => r.blob());
      const audioUrl = URL.createObjectURL(audioBlob);

      // Crea audio element
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        console.log('✅ Audio ElevenLabs completato');
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        onEnd?.();
      };

      audio.onerror = (event) => {
        const err = new Error('Audio playback failed');
        console.error('❌ Errore riproduzione audio:', event);
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        onError?.(err);
      };

      await audio.play();

    } catch (error) {
      console.error('❌ ElevenLabs TTS Error:', error);
      setIsSpeaking(false);
      audioRef.current = null;
      onError?.(error as Error);
    }
  };

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsSpeaking(false);
  };

  return { speak, stop, isSpeaking };
};
