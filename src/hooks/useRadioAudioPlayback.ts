import { useState, useRef, useCallback } from 'react';

interface UseRadioAudioPlaybackReturn {
  isAudioPlaying: boolean;
  currentPlayingId: string;
  audioElementRef: React.MutableRefObject<HTMLAudioElement | null>;
  canPlayAudio: (audioId: string) => boolean;
  handleAudioStart: (audioId: string) => void;
  handleAudioEnd: () => void;
  handleAudioError: () => void;
  stopCurrentAudio: () => void;
}

export const useRadioAudioPlayback = (): UseRadioAudioPlaybackReturn => {
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [currentPlayingId, setCurrentPlayingId] = useState('');
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const canPlayAudio = useCallback((audioId: string) => {
    return !isAudioPlaying || currentPlayingId === audioId;
  }, [isAudioPlaying, currentPlayingId]);

  const handleAudioStart = useCallback((audioId: string) => {
    console.log(`🔊 [useRadioAudioPlayback] Audio START: ${audioId}`);
    setIsAudioPlaying(true);
    setCurrentPlayingId(audioId);
  }, []);

  const handleAudioEnd = useCallback(() => {
    console.log(`⏸️ [useRadioAudioPlayback] Audio END`);
    // Stop the actual HTMLAudioElement imperatively
    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }
    setIsAudioPlaying(false);
    setCurrentPlayingId('');
  }, []);

  const handleAudioError = useCallback(() => {
    console.error(`❌ [useRadioAudioPlayback] Audio ERROR`);
    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }
    setIsAudioPlaying(false);
    setCurrentPlayingId('');
  }, []);

  const stopCurrentAudio = useCallback(() => {
    console.log(`🛑 [useRadioAudioPlayback] Force STOP (imperative)`);
    // CRITICAL: Stop the actual HTMLAudioElement before resetting state
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
    }
    setIsAudioPlaying(false);
    setCurrentPlayingId('');
  }, []);

  return {
    isAudioPlaying,
    currentPlayingId,
    audioElementRef,
    canPlayAudio,
    handleAudioStart,
    handleAudioEnd,
    handleAudioError,
    stopCurrentAudio
  };
};
