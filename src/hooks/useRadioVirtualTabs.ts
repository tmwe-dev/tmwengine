import { useState, useEffect, useCallback, useRef } from 'react';
import { RadioMessage } from '@/types/radio';

interface UseRadioVirtualTabsProps {
  messages: RadioMessage[];
  isAutoAdvanceEnabled: boolean;
  isAudioPlaying: boolean;
}

interface UseRadioVirtualTabsReturn {
  activeMessageId: string;
  canAutoPlayForMessage: (messageId: string) => boolean;
  handleAudioEnd: () => void;
}

export const useRadioVirtualTabs = ({
  messages,
  isAutoAdvanceEnabled,
  isAudioPlaying
}: UseRadioVirtualTabsProps): UseRadioVirtualTabsReturn => {
  const [activeMessageId, setActiveMessageId] = useState('');
  const lastProcessedCountRef = useRef(0);

  // ✅ Inizializzazione, rivalidazione e gestione nuovi messaggi
  useEffect(() => {
    const messagesWithAudio = messages.filter(m => m.audio_url);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [useRadioVirtualTabs] useEffect triggered:', {
        activeMessageId: activeMessageId.substring(0, 8) || 'none',
        messagesLength: messages.length,
        messagesWithAudio: messagesWithAudio.length,
        lastProcessedCount: lastProcessedCountRef.current,
        isAudioPlaying
      });
    }
    
    const firstWithAudio = messagesWithAudio[0];
    
    if (!firstWithAudio) {
      if (process.env.NODE_ENV === 'development') {
        console.log('⚠️ [useRadioVirtualTabs] Nessun messaggio con audio');
      }
      return;
    }

    // CASO 1: Inizializzazione - nessun messaggio attivo ancora
    if (!activeMessageId) {
      console.log(`🆕 [useRadioVirtualTabs] Inizializzazione: ${firstWithAudio.sender_name}`);
      setActiveMessageId(firstWithAudio.id);
      lastProcessedCountRef.current = messagesWithAudio.length;
      return;
    }

    // CASO 2: Rivalidazione - il messaggio attivo non esiste più
    const currentMessage = messages.find(m => m.id === activeMessageId);
    if (!currentMessage || !currentMessage.audio_url) {
      console.log(`🔄 [useRadioVirtualTabs] Rivalidazione: messaggio attivo non valido → ${firstWithAudio.sender_name}`);
      setActiveMessageId(firstWithAudio.id);
      lastProcessedCountRef.current = messagesWithAudio.length;
      return;
    }

    // CASO 3: NUOVO MESSAGGIO ARRIVATO (come Chat Laboratory)
    if (messagesWithAudio.length > lastProcessedCountRef.current) {
      const currentIndex = messagesWithAudio.findIndex(m => m.id === activeMessageId);
      const newMessages = messagesWithAudio.slice(currentIndex + 1);
      
      if (newMessages.length > 0) {
        const nextMessage = newMessages[0];
        
        // 🎯 LOGICA IDENTICA A CHAT LABORATORY (useTabSwitching.ts linea 67-73)
        if (!isAudioPlaying && isAutoAdvanceEnabled) {
          // Audio fermo → ATTIVA SUBITO
          console.log(`▶️ [useRadioVirtualTabs] Audio fermo → Attivo ${nextMessage.sender_name} SUBITO`);
          setActiveMessageId(nextMessage.id);
          lastProcessedCountRef.current = messagesWithAudio.length;
        } else if (isAudioPlaying) {
          // Audio attivo → logga che il messaggio aspetta (gestito da handleAudioEnd)
          console.log(`⏳ [useRadioVirtualTabs] Audio attivo → ${nextMessage.sender_name} aspetta`);
          lastProcessedCountRef.current = messagesWithAudio.length;
        } else {
          // Auto-advance disabilitato
          console.log(`🚫 [useRadioVirtualTabs] Auto-advance OFF → ${nextMessage.sender_name} ignorato`);
          lastProcessedCountRef.current = messagesWithAudio.length;
        }
      } else {
        lastProcessedCountRef.current = messagesWithAudio.length;
      }
    }
  }, [messages, activeMessageId, isAutoAdvanceEnabled, isAudioPlaying]);

  // ✅ Funzione per verificare se un messaggio può fare autoplay
  const canAutoPlayForMessage = useCallback((messageId: string) => {
    return messageId === activeMessageId;
  }, [activeMessageId]);

  // ✅ handleAudioEnd: trova semplicemente prossimo messaggio con audio
  const handleAudioEnd = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 [useRadioVirtualTabs] handleAudioEnd chiamato');
    }
    
    if (!isAutoAdvanceEnabled) {
      if (process.env.NODE_ENV === 'development') {
        console.log('⏸️ [useRadioVirtualTabs] Auto-advance disabilitato');
      }
      return;
    }

    const currentIndex = messages.findIndex(m => m.id === activeMessageId);
    if (currentIndex === -1) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ [useRadioVirtualTabs] activeMessageId non trovato');
      }
      return;
    }

    // Trova prossimo messaggio con audio (salta automaticamente HUMAN se non hanno audio)
    const nextMessage = messages
      .slice(currentIndex + 1)
      .find(m => m.audio_url);
    
    if (nextMessage) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🎵 [useRadioVirtualTabs] Prossimo messaggio: ${nextMessage.sender_name}`);
      }
      // FIX 1: Delay per transizione fluida
      setTimeout(() => {
        setActiveMessageId(nextMessage.id);
      }, 50);
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log('🏁 [useRadioVirtualTabs] Nessun altro messaggio con audio');
      }
    }
  }, [messages, activeMessageId, isAutoAdvanceEnabled]);

  return {
    activeMessageId,
    canAutoPlayForMessage,
    handleAudioEnd
  };
};
