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
}

export const useAutoSpeaker = ({ messages, currentUserId, translatedMessages = {} }: AutoSpeakerProps) => {
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

    lastMessageIdRef.current = latestMessage.id;

    // Cancella eventuali letture in corso
    synthRef.current.cancel();

    // Funzione async per gestire il polling della traduzione
    const startSpeaking = async () => {
      let textToSpeak = translatedMessages[latestMessage.id];
      let attempts = 0;
      const maxAttempts = 20; // 20 x 100ms = 2 secondi max
      
      console.log('🔊 useAutoSpeaker - Inizio polling traduzione:', {
        messageId: latestMessage.id,
        initialTranslation: textToSpeak,
        originalText: latestMessage.content
      });

      // Polling: controlla ogni 100ms se traduzione è disponibile
      while (!textToSpeak && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        textToSpeak = translatedMessages[latestMessage.id];
        attempts++;
        
        if (textToSpeak) {
          console.log(`✅ Traduzione trovata dopo ${attempts * 100}ms`);
          break;
        }
      }

      // Fallback su testo originale se traduzione non arriva
      if (!textToSpeak) {
        console.warn('⚠️ Traduzione non disponibile dopo 2s, uso testo originale');
        textToSpeak = latestMessage.content;
      }

      console.log('🔊 useAutoSpeaker - Dati audio finali:', {
        messageId: latestMessage.id,
        originalText: latestMessage.content,
        textToSpeak,
        readingLanguage: profile.readingLanguage,
        isTranslated: textToSpeak !== latestMessage.content,
        waitedMs: attempts * 100
      });
      
      // Crea utterance con testo tradotto se disponibile
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      
      // Imposta la lingua
      utterance.lang = profile.readingLanguage || 'it-IT';
      
      // Cerca una voce appropriata
      const voices = synthRef.current!.getVoices();
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
      synthRef.current?.speak(utterance);
    };

    // Aspetta 100ms e poi inizia il polling
    const timeoutId = setTimeout(() => {
      startSpeaking();
    }, 100);

    // Cleanup timeout se il componente si smonta o il messaggio cambia
    return () => clearTimeout(timeoutId);
  }, [messages, currentUserId, profile, translatedMessages]);

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  return { stopSpeaking, isSpeaking };
};
