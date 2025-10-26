import { useState, useEffect } from 'react';

const AUDIO_ENABLED_KEY = 'radio-chat-audio-enabled';

export const useAudioPreference = () => {
  const [isAudioEnabled, setIsAudioEnabled] = useState(() => {
    const stored = localStorage.getItem(AUDIO_ENABLED_KEY);
    return stored !== null ? stored === 'true' : true; // default: abilitato
  });

  const toggleAudio = () => {
    setIsAudioEnabled(prev => {
      const newValue = !prev;
      localStorage.setItem(AUDIO_ENABLED_KEY, String(newValue));
      return newValue;
    });
  };

  useEffect(() => {
    localStorage.setItem(AUDIO_ENABLED_KEY, String(isAudioEnabled));
  }, [isAudioEnabled]);

  return { isAudioEnabled, toggleAudio, setIsAudioEnabled };
};
