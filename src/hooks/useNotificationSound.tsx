import { useEffect, useRef } from 'react';

export type NotificationSoundType = 'message' | 'private-chat' | 'mention';

interface NotificationSoundConfig {
  enabled: boolean;
  volume: number;
}

export const useNotificationSound = (config: NotificationSoundConfig = { enabled: true, volume: 0.5 }) => {
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      audioContextRef.current = new AudioContext();
    }
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  const playSound = (type: NotificationSoundType = 'message') => {
    if (!config.enabled || !audioContextRef.current) return;

    const audioContext = audioContextRef.current;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Suoni diversi per ogni tipo
    switch (type) {
      case 'message':
        // Bip semplice per messaggi normali
        oscillator.frequency.value = 800;
        gainNode.gain.setValueAtTime(config.volume, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
        break;
      
      case 'private-chat':
        // Doppio bip per chat private
        oscillator.frequency.value = 900;
        gainNode.gain.setValueAtTime(config.volume, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
        
        // Secondo bip
        setTimeout(() => {
          const osc2 = audioContext.createOscillator();
          const gain2 = audioContext.createGain();
          osc2.connect(gain2);
          gain2.connect(audioContext.destination);
          osc2.frequency.value = 1000;
          gain2.gain.setValueAtTime(config.volume, audioContext.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
          osc2.start(audioContext.currentTime);
          osc2.stop(audioContext.currentTime + 0.1);
        }, 150);
        break;
      
      case 'mention':
        // Triplo bip per menzioni
        [0, 150, 300].forEach((delay, i) => {
          setTimeout(() => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.frequency.value = 850 + (i * 100);
            gain.gain.setValueAtTime(config.volume, audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            osc.start(audioContext.currentTime);
            osc.stop(audioContext.currentTime + 0.1);
          }, delay);
        });
        break;
    }
  };

  return { playSound };
};
