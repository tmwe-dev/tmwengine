import { useEffect, useRef, useState } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';

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
  translatedMessages?: Record<string, string>;
  userProfiles?: Record<string, { preferred_language?: string }>;
}

export const useAutoSpeaker = ({ messages, currentUserId, translatedMessages = {}, userProfiles = {} }: AutoSpeakerProps) => {
  const { profile } = useUserProfile();
  const lastMessageIdRef = useRef<string | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  useEffect(() => {
    // Auto-speaker è una preferenza personale dell'utente
    if (!profile?.enableAutoSpeaker || !synthRef.current) return;
    if (messages.length === 0) return;

    const latestMessage = messages[messages.length - 1];
    
    // Non leggere i propri messaggi
    if (latestMessage.user_id === currentUserId) return;
    
    // Non leggere lo stesso messaggio due volte
    if (latestMessage.id === lastMessageIdRef.current) return;
    
    // Non leggere messaggi non testuali
    if (latestMessage.message_type !== 'text' || !latestMessage.content) return;

    // Controlla se il messaggio è già stato letto
    if (latestMessage.id === lastMessageIdRef.current) return;

    // Determina se serve traduzione
    const senderProfile = userProfiles[latestMessage.user_id];
    const needsTranslation = senderProfile?.preferred_language && 
                            senderProfile.preferred_language !== profile.readingLanguage &&
                            profile.readingLanguage;

    const translatedText = translatedMessages[latestMessage.id];

    // Se serve traduzione ma non è ancora pronta, aspetta il prossimo update
    if (needsTranslation && !translatedText) {
      console.log('⏳ useAutoSpeaker - Traduzione non ancora pronta, aspetto update:', {
        messageId: latestMessage.id,
        senderLanguage: senderProfile?.preferred_language,
        targetLanguage: profile.readingLanguage
      });
      return;
    }

    // Marca il messaggio come già letto
    lastMessageIdRef.current = latestMessage.id;

    // Cancella eventuali letture in corso
    synthRef.current.cancel();

    // Usa traduzione se disponibile, altrimenti originale
    const textToSpeak = translatedText || latestMessage.content;

    console.log('🔊 useAutoSpeaker - Parto immediatamente:', {
      messageId: latestMessage.id,
      textToSpeak,
      isTranslated: !!translatedText,
      needsTranslation
    });

    // Crea utterance
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    
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
  }, [messages, currentUserId, profile, translatedMessages, userProfiles]);

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  return { stopSpeaking, isSpeaking };
};
