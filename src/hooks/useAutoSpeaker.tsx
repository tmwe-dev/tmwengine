import { useEffect, useRef, useState } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useRoomAISettings } from '@/hooks/useRoomAISettings';

interface Message {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  message_type: string;
}

interface AutoSpeakerProps {
  messages: Message[];
  currentUserId: string;
  roomId: string;
}

export const useAutoSpeaker = ({ messages, currentUserId, roomId }: AutoSpeakerProps) => {
  const { profile } = useUserProfile();
  const { settings: roomSettings } = useRoomAISettings(roomId);
  const lastMessageIdRef = useRef<string | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  useEffect(() => {
    // Verifica che sia abilitato sia a livello utente che a livello stanza
    if (!profile?.enableAutoSpeaker || !roomSettings?.enableAutoSpeaker || !synthRef.current) return;
    if (messages.length === 0) return;

    const latestMessage = messages[messages.length - 1];
    
    // Non leggere i propri messaggi
    if (latestMessage.user_id === currentUserId) return;
    
    // Non leggere lo stesso messaggio due volte
    if (latestMessage.id === lastMessageIdRef.current) return;
    
    // Non leggere messaggi non testuali
    if (latestMessage.message_type !== 'text' || !latestMessage.content) return;

    lastMessageIdRef.current = latestMessage.id;

    // Cancella eventuali letture in corso
    synthRef.current.cancel();

    // Crea utterance
    const utterance = new SpeechSynthesisUtterance(latestMessage.content);
    
    // Imposta la lingua
    utterance.lang = profile.readingLanguage || 'it-IT';
    
    // Cerca una voce appropriata
    const voices = synthRef.current.getVoices();
    const voice = voices.find(v => v.lang.startsWith(profile.readingLanguage)) 
                  || voices.find(v => v.lang.startsWith('it'));
    
    if (voice) {
      utterance.voice = voice;
    }

    // Imposta velocità e pitch
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Eventi
    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setIsSpeaking(false);
    };

    // Pronuncia
    synthRef.current.speak(utterance);
  }, [messages, currentUserId, profile, roomSettings]);

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  return { stopSpeaking, isSpeaking };
};
