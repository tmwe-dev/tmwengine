import { useEffect, useRef, useState } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useElevenLabsTTS } from '@/hooks/useElevenLabsTTS';

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
  ttsEngine?: string;
  selectedVoice?: string;
  elevenLabsVoices?: Array<{ voice_id: string; name: string }>;
  isLoadingVoices?: boolean;
}

export const useAutoSpeaker = ({ 
  messages, 
  currentUserId, 
  translatedMessages = {}, 
  userProfiles = {},
  ttsEngine = 'native',
  selectedVoice = 'Aria',
  elevenLabsVoices = [],
  isLoadingVoices = false
}: AutoSpeakerProps) => {
  const { profile } = useUserProfile();
  const lastMessageIdRef = useRef<string | null>(null);
  const lastTranslatedMessageIdRef = useRef<string | null>(null); // Tracking separato per traduzioni
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Hook ElevenLabs TTS
  const elevenLabsTTS = useElevenLabsTTS();

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
    
    // Non leggere messaggi non testuali
    if (latestMessage.message_type !== 'text' || !latestMessage.content) return;

    // Determina se serve traduzione
    const senderProfile = userProfiles[latestMessage.user_id];
    const needsTranslation = senderProfile?.preferred_language && 
                            senderProfile.preferred_language !== profile.readingLanguage &&
                            profile.readingLanguage;

    const translatedText = translatedMessages[latestMessage.id];

    // === NUOVA LOGICA: TRACKING SEPARATO ===
    if (needsTranslation) {
      // Caso: traduzione richiesta
      if (!translatedText) {
        console.log('⏳ Traduzione non pronta, aspetto...', { 
          messageId: latestMessage.id,
          senderLanguage: senderProfile?.preferred_language,
          targetLanguage: profile.readingLanguage
        });
        return; // Aspetta che arrivi la traduzione
      }
      
      // Traduzione pronta: verifica se già letta
      if (lastTranslatedMessageIdRef.current === latestMessage.id) {
        console.log('⏭️ Traduzione già letta', { messageId: latestMessage.id });
        return;
      }
      
      // Marca come letto (tradotto)
      lastTranslatedMessageIdRef.current = latestMessage.id;
      console.log('🔊 Leggo traduzione:', { 
        messageId: latestMessage.id, 
        text: translatedText,
        targetLanguage: profile.readingLanguage 
      });
      
    } else {
      // Caso: NO traduzione richiesta
      if (lastMessageIdRef.current === latestMessage.id) {
        console.log('⏭️ Messaggio originale già letto', { messageId: latestMessage.id });
        return;
      }
      
      // Marca come letto (originale)
      lastMessageIdRef.current = latestMessage.id;
      console.log('🔊 Leggo originale:', { 
        messageId: latestMessage.id,
        language: profile.readingLanguage || 'it'
      });
    }

    // Usa traduzione se disponibile, altrimenti originale
    const textToSpeak = translatedText || latestMessage.content;
    const language = profile.readingLanguage || 'it';

    console.log('🔊 useAutoSpeaker - Avvio TTS:', {
      engine: ttsEngine,
      messageId: latestMessage.id,
      language,
      isTranslated: !!translatedText
    });

    // ========= ROUTING TTS ENGINE =========
    if (ttsEngine === 'elevenlabs') {
      // === ElevenLabs TTS ===
      elevenLabsTTS.stop();
      
      elevenLabsTTS.speak({
        text: textToSpeak,
        language,
        voiceId: selectedVoice,
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false),
        onError: (error) => {
          console.error('❌ ElevenLabs fallito, fallback su native:', error);
          speakWithNative(textToSpeak, language);
        }
      });

    } else {
      // === SpeechSynthesis nativo ===
      speakWithNative(textToSpeak, language);
    }

  }, [messages, currentUserId, profile, translatedMessages, userProfiles, elevenLabsTTS]);

  // ========= FUNZIONE HELPER: TTS NATIVO =========
  const speakWithNative = (text: string, language: string) => {
    if (!synthRef.current) return;

    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    
    const voices = synthRef.current.getVoices();
    const voice = voices.find(v => v.lang.startsWith(language)) 
                  || voices.find(v => v.lang.startsWith('it'));
    
    if (voice) utterance.voice = voice;

    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setIsSpeaking(false);
    };

    synthRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    // Stop native
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    // Stop ElevenLabs
    elevenLabsTTS.stop();
    
    setIsSpeaking(false);
  };

  return { stopSpeaking, isSpeaking };
};
