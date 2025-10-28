import { useState, useEffect, useCallback } from 'react';
import { RadioMessage } from '@/types/radio';

interface UseRadioVirtualTabsProps {
  messages: RadioMessage[];
  isAutoAdvanceEnabled: boolean;
}

interface UseRadioVirtualTabsReturn {
  activeMessageId: string;
  canAutoPlayForMessage: (messageId: string) => boolean;
  handleAudioEnd: () => void;
}

export const useRadioVirtualTabs = ({
  messages,
  isAutoAdvanceEnabled
}: UseRadioVirtualTabsProps): UseRadioVirtualTabsReturn => {
  const [activeMessageId, setActiveMessageId] = useState('');

  // ✅ Inizializzazione e rivalidazione: assicura che activeMessageId punti sempre a messaggio esistente
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [useRadioVirtualTabs] useEffect triggered:', {
        activeMessageId,
        messagesLength: messages.length,
        messagesWithAudio: messages.filter(m => m.audio_url).length
      });
    }
    
    // ✅ Trova sempre il primo messaggio con audio disponibile
    const firstWithAudio = messages.find(m => m.audio_url);
    
    if (firstWithAudio) {
      // ✅ RIVALIDAZIONE: Verifica che activeMessageId punti a un messaggio esistente con audio
      const currentMessage = messages.find(m => m.id === activeMessageId);
      const isCurrentValid = currentMessage && currentMessage.audio_url;
      
      // ✅ Setta/Resetta activeMessageId se:
      // 1. Non è ancora settato (!activeMessageId)
      // 2. O il messaggio attivo non esiste più/non ha audio (!isCurrentValid)
      if (!isCurrentValid) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔄 [useRadioVirtualTabs] ${!activeMessageId ? 'Inizializzazione' : 'Rivalidazione'}: settaggio active → ${firstWithAudio.sender_name}`);
        }
        setActiveMessageId(firstWithAudio.id);
      }
    } else if (process.env.NODE_ENV === 'development') {
      console.log('⚠️ [useRadioVirtualTabs] Nessun messaggio con audio trovato ancora');
    }
  }, [messages, activeMessageId]);

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
