import { useRef, useEffect } from 'react';
import { toast } from 'sonner';

interface AudioPlayerProps {
  audioBase64: string | null;
  onPlaybackComplete?: () => void;
}

export const AudioPlayer = ({ audioBase64, onPlaybackComplete }: AudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioBase64) return;

    const playAudio = async () => {
      try {
        // Convert base64 to blob
        const binaryString = atob(audioBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);

        // Create and play audio
        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onended = () => {
          URL.revokeObjectURL(url);
          if (onPlaybackComplete) {
            onPlaybackComplete();
          }
        };

        audio.onerror = (error) => {
          console.error('Audio playback error:', error);
          toast.error('Errore riproduzione audio');
          URL.revokeObjectURL(url);
          if (onPlaybackComplete) {
            onPlaybackComplete();
          }
        };

        await audio.play();
        console.log('🔊 Audio playback started');

      } catch (error) {
        console.error('Audio setup error:', error);
        toast.error('Errore audio', {
          description: error.message,
        });
        if (onPlaybackComplete) {
          onPlaybackComplete();
        }
      }
    };

    playAudio();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [audioBase64, onPlaybackComplete]);

  return null; // This component doesn't render anything
};
