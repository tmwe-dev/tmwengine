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
  unlockAudioElement: () => void;
}

export const useRadioAudioPlayback = (): UseRadioAudioPlaybackReturn => {
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [currentPlayingId, setCurrentPlayingId] = useState('');
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const canPlayAudio = useCallback((audioId: string) => {
    return !isAudioPlaying || currentPlayingId === audioId;
  }, [isAudioPlaying, currentPlayingId]);

  /**
   * Call this during a user gesture (click/tap) to pre-unlock an Audio element.
   * Browsers require a user gesture to allow .play(). By creating and "playing"
   * a silent audio during the gesture, we unlock the element for later reuse
   * when the AI response arrives (potentially 20-30s later).
   */
  const unlockAudioElement = useCallback(() => {
    // Don't re-unlock if already exists and is usable
    if (audioElementRef.current) {
      console.log('🔓 [useRadioAudioPlayback] Audio element already exists, skipping unlock');
      return;
    }
    
    console.log('🔓 [useRadioAudioPlayback] Unlocking audio element on user gesture');
    const audio = new Audio();
    // Play a tiny silent "src" to unlock the element in the browser context
    // Using a minimal valid WAV data URI (silent)
    audio.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
    audio.volume = 0;
    audio.play()
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = 1;
        audio.src = ''; // Clear src, ready for real audio
        console.log('✅ [useRadioAudioPlayback] Audio element unlocked successfully');
      })
      .catch((err) => {
        console.warn('⚠️ [useRadioAudioPlayback] Unlock failed (non-critical):', err);
      });
    
    audioElementRef.current = audio;
  }, []);

  const handleAudioStart = useCallback((audioId: string) => {
    console.log(`🔊 [useRadioAudioPlayback] Audio START: ${audioId}`);
    setIsAudioPlaying(true);
    setCurrentPlayingId(audioId);
  }, []);

  const handleAudioEnd = useCallback(() => {
    console.log(`⏸️ [useRadioAudioPlayback] Audio END`);
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
    stopCurrentAudio,
    unlockAudioElement
  };
};
