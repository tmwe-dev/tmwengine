import { useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ElevenLabsTTSProps {
  text: string;
  language: string;
  voiceId?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

// Mapping lingua -> Voice ID ElevenLabs
const VOICE_MAP: Record<string, string> = {
  'it': '9BWtsMINqrJLrRacOk9x', // Aria (Italian)
  'en': 'EXAVITQu4vr4xnSDxMaL', // Sarah (English)
  'es': 'onwK4e9ZLuTAKqWW03F9', // Daniel (Spanish)
  'fr': 'pFZP5JQG7iQjIQuC4Bku', // Lily (French)
  'de': 'TX3LPaxmHKxFdv7VOQHJ', // Liam (German)
  'th': '9BWtsMINqrJLrRacOk9x', // Aria (Thai supported by Turbo v2.5)
  'pt': 'pqHfZKP75CvOlQylNhV4', // Bill (Portuguese)
  'ru': 'cjVigY5qzO86Huf0OWal', // Eric (Russian)
  'zh': 'cgSgspJ2msm6clMCkdW9', // Jessica (Chinese)
  'ja': 'iP95p4xoKVk53GoZ742B', // Chris (Japanese)
  'ar': 'bIHbv24MWmeRgasZH58o'  // Will (Arabic)
};

export const useElevenLabsTTS = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

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

      // Seleziona voice ID in base alla lingua
      const selectedVoiceId = voiceId || VOICE_MAP[language] || VOICE_MAP['it'];

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
