import { useState } from 'react';

interface UseRadioAudioPlaybackReturn {
  isAudioPlaying: boolean;
  currentPlayingId: string;
  canPlayAudio: (audioId: string) => boolean;
  handleAudioStart: (audioId: string) => void;
  handleAudioEnd: () => void;
  handleAudioError: () => void;
  stopCurrentAudio: () => void;
}

export const useRadioAudioPlayback = (): UseRadioAudioPlaybackReturn => {
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [currentPlayingId, setCurrentPlayingId] = useState('');

  const canPlayAudio = (audioId: string) => {
    // Audio può partire SOLO se:
    // 1. Nessun altro audio è attivo
    // 2. Oppure è lo stesso ID (resume)
    return !isAudioPlaying || currentPlayingId === audioId;
  };

  const handleAudioStart = (audioId: string) => {
    console.log(`🔊 [useRadioAudioPlayback] Audio START: ${audioId}`);
    setIsAudioPlaying(true);
    setCurrentPlayingId(audioId);
  };

  const handleAudioEnd = () => {
    console.log(`⏸️ [useRadioAudioPlayback] Audio END: ${currentPlayingId}`);
    setIsAudioPlaying(false);
    setCurrentPlayingId('');
  };

  const handleAudioError = () => {
    console.error(`❌ [useRadioAudioPlayback] Audio ERROR: ${currentPlayingId}`);
    setIsAudioPlaying(false);
    setCurrentPlayingId('');
  };

  const stopCurrentAudio = () => {
    console.log(`🛑 [useRadioAudioPlayback] Force STOP: ${currentPlayingId}`);
    setIsAudioPlaying(false);
    setCurrentPlayingId('');
  };

  return {
    isAudioPlaying,
    currentPlayingId,
    canPlayAudio,
    handleAudioStart,
    handleAudioEnd,
    handleAudioError,
    stopCurrentAudio
  };
};
