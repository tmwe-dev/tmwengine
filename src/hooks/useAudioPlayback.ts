import { useState } from 'react';

interface UseAudioPlaybackReturn {
  isAudioPlaying: boolean;
  handleAudioStart: () => void;
  handleAudioEnd: () => void;
  handleAudioError: () => void;
}

export const useAudioPlayback = (): UseAudioPlaybackReturn => {
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  const handleAudioStart = () => {
    console.log(`🔊 [useAudioPlayback] Audio START`);
    setIsAudioPlaying(true);
  };

  const handleAudioEnd = () => {
    console.log(`⏸️ [useAudioPlayback] Audio END`);
    setIsAudioPlaying(false);
  };

  const handleAudioError = () => {
    console.error(`❌ [useAudioPlayback] Audio ERROR`);
    setIsAudioPlaying(false);
  };

  return {
    isAudioPlaying,
    handleAudioStart,
    handleAudioEnd,
    handleAudioError
  };
};
