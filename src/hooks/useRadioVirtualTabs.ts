import { useState, useEffect, useRef, useCallback } from 'react';
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
  const [unseenMessagesQueue, setUnseenMessagesQueue] = useState<string[]>([]);
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

    // Primo messaggio AI: attiva SOLO se nessun audio sta suonando
    const aiMessagesBeforeThis = messages
      .slice(0, previousMessagesLengthRef.current)
      .filter(m => m.sender_type !== 'human').length;
    
    if (aiMessagesBeforeThis === 0) {
      // ✅ CAMBIO: Controlla se audio sta suonando
      if (!isAudioPlaying) {
        console.log(`📨 [useRadioVirtualTabs] Primo messaggio AI → Tab attivo: ${newMessage.sender_name}`);
        setActiveMessageId(newMessage.id);
      } else {
        console.log(`📨 [useRadioVirtualTabs] Audio in corso, accodo primo messaggio: ${newMessage.sender_name}`);
        setUnseenMessagesQueue(prev => [...prev, newMessage.id]);
      }
    } else {
      // Messaggi successivi: aggiungi a coda
      console.log(`📨 [useRadioVirtualTabs] Nuovo messaggio AI → In coda: ${newMessage.sender_name}`);
      setUnseenMessagesQueue(prev => [...prev, newMessage.id]);
    }

    previousMessagesLengthRef.current++;
  }, [messages, isAudioPlaying]);

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
    console.log('🔄 [useRadioVirtualTabs] ═══ handleAudioEnd CHIAMATO ═══');
    console.log('🔄 [useRadioVirtualTabs] Coda messaggi:', unseenMessagesQueue.length);
    
    // ✅ PRIORITÀ 1: Processa coda se presente
    if (unseenMessagesQueue.length > 0) {
      const nextMessageId = unseenMessagesQueue[0];
      console.log(`🎵 [useRadioVirtualTabs] Processando dalla coda: ${nextMessageId.substring(0, 8)}`);
      setActiveMessageId(nextMessageId);
      setUnseenMessagesQueue(prev => prev.slice(1)); // Rimuovi primo elemento
      return;
    }
    
    // ✅ PRIORITÀ 2: Auto-advance se abilitato
    console.log('🔄 [useRadioVirtualTabs] isAutoAdvanceEnabled:', isAutoAdvanceEnabled);
    console.log('🔄 [useRadioVirtualTabs] activeMessageId corrente:', activeMessageId);
    console.log('🔄 [useRadioVirtualTabs] Totale messaggi:', messages.length);
    
    if (!isAutoAdvanceEnabled) {
      console.log('⏸️ [useRadioVirtualTabs] Auto-advance disabilitato e coda vuota');
      return;
    }

    const currentIndex = messages.findIndex(m => m.id === activeMessageId);
    console.log('🔄 [useRadioVirtualTabs] currentIndex:', currentIndex);
    if (currentIndex === -1) {
      console.error('❌ [useRadioVirtualTabs] activeMessageId non trovato nei messaggi!');
      return;
    }

    // Trova prossimo messaggio AI (salta HUMAN)
    let nextIndex = currentIndex + 1;
    console.log('🔄 [useRadioVirtualTabs] Cerco prossimo messaggio da index:', nextIndex);
    
    while (nextIndex < messages.length) {
      const nextMessage = messages[nextIndex];
      console.log(`🔄 [useRadioVirtualTabs] Controllo messaggio ${nextIndex}: ${nextMessage.sender_name} (${nextMessage.sender_type})`);
      
      if (nextMessage.sender_type !== 'human') {
        console.log(`🎵 [useRadioVirtualTabs] ✅ TROVATO prossimo messaggio AI: ${nextMessage.sender_name}`);
        console.log(`🎵 [useRadioVirtualTabs] Cambio activeMessageId da ${activeMessageId.substring(0, 8)} a ${nextMessage.id.substring(0, 8)}`);
        setActiveMessageId(nextMessage.id);
        console.log('🎵 [useRadioVirtualTabs] setActiveMessageId eseguito!');
        return;
      }
      
      nextIndex++;
    }

    console.log('🏁 [useRadioVirtualTabs] Nessun altro messaggio AI disponibile');
  }, [messages, activeMessageId, isAutoAdvanceEnabled, unseenMessagesQueue]);

  return {
    activeMessageId,
    canAutoPlayForMessage,
    handleAudioEnd
  };
};
