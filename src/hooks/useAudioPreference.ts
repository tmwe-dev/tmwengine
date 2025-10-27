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
      
      // ✅ Triggera evento custom per sincronizzare altri componenti
      window.dispatchEvent(new CustomEvent('audio-preference-changed', { 
        detail: { isAudioEnabled: newValue } 
      }));
      
      return newValue;
    });
  };

  // ✅ Ascolta i cambiamenti da altri componenti
  useEffect(() => {
    const handleStorageChange = (e: CustomEvent<{ isAudioEnabled: boolean }>) => {
      setIsAudioEnabled(e.detail.isAudioEnabled);
    };

    window.addEventListener('audio-preference-changed', handleStorageChange as EventListener);
    
    return () => {
      window.removeEventListener('audio-preference-changed', handleStorageChange as EventListener);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(AUDIO_ENABLED_KEY, String(isAudioEnabled));
  }, [isAudioEnabled]);

  return { isAudioEnabled, toggleAudio, setIsAudioEnabled };
};
