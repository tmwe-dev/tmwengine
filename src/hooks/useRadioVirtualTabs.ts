import { useState, useEffect, useRef, useCallback } from 'react';
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
  const previousMessagesLengthRef = useRef(0);

  // ✅ Inizializzazione: imposta primo messaggio AI come attivo
  useEffect(() => {
    if (messages.length > 0 && !activeMessageId) {
      const firstAIMessage = messages.find(m => m.sender_type !== 'human');
      if (firstAIMessage) {
        console.log(`🎯 [useRadioVirtualTabs] Primo messaggio AI attivo: ${firstAIMessage.sender_name}`);
        setActiveMessageId(firstAIMessage.id);
      }
    }
  }, [messages.length, activeMessageId]);

  // ✅ Gestione nuovi messaggi (REPLICA LOGICA MessageTabsView)
  useEffect(() => {
    if (messages.length <= previousMessagesLengthRef.current) return;

    const newMessage = messages[previousMessagesLengthRef.current];
    
    if (!newMessage) {
      previousMessagesLengthRef.current = messages.length;
      return;
    }

    // Messaggio HUMAN: ignora (non cambia tab virtuale)
    if (newMessage.sender_type === 'human') {
      console.log(`👤 [useRadioVirtualTabs] Messaggio HUMAN ignorato`);
      previousMessagesLengthRef.current++;
      return;
    }

    // Primo messaggio AI: attiva subito
    const aiMessagesBeforeThis = messages
      .slice(0, previousMessagesLengthRef.current)
      .filter(m => m.sender_type !== 'human').length;
    
    if (aiMessagesBeforeThis === 0) {
      console.log(`📨 [useRadioVirtualTabs] Primo messaggio AI → Tab attivo: ${newMessage.sender_name}`);
      setActiveMessageId(newMessage.id);
    } else {
      // Messaggi successivi: NON cambiare tab (audio in corso)
      console.log(`📨 [useRadioVirtualTabs] Nuovo messaggio AI → In coda: ${newMessage.sender_name}`);
    }

    previousMessagesLengthRef.current++;
  }, [messages]);

  // ✅ Funzione per verificare se un messaggio può fare autoplay
  const canAutoPlayForMessage = useCallback((messageId: string) => {
    const canPlay = messageId === activeMessageId;
    if (canPlay) {
      console.log(`🔊 [useRadioVirtualTabs] canAutoPlay=true per ${messageId.substring(0, 8)}`);
    }
    return canPlay;
  }, [activeMessageId]);

  // ✅ handleAudioEnd: REPLICA LOGICA MessageTabsView
  const handleAudioEnd = useCallback(() => {
    if (!isAutoAdvanceEnabled) {
      console.log('⏸️ [useRadioVirtualTabs] Auto-advance disabilitato');
      return;
    }

    const currentIndex = messages.findIndex(m => m.id === activeMessageId);
    if (currentIndex === -1) return;

    // Trova prossimo messaggio AI (salta HUMAN)
    let nextIndex = currentIndex + 1;
    while (nextIndex < messages.length) {
      const nextMessage = messages[nextIndex];
      
      if (nextMessage.sender_type !== 'human') {
        console.log(`🎵 [useRadioVirtualTabs] Audio finito → Tab successivo: ${nextMessage.sender_name}`);
        setActiveMessageId(nextMessage.id);
        return;
      }
      
      nextIndex++;
    }

    console.log('🏁 [useRadioVirtualTabs] Nessun altro messaggio AI disponibile');
  }, [messages, activeMessageId, isAutoAdvanceEnabled]);

  return {
    activeMessageId,
    canAutoPlayForMessage,
    handleAudioEnd
  };
};
