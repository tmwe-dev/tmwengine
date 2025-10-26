import { useState, useEffect, useRef, useCallback } from 'react';
import { RadioMessage } from '@/types/radio';

interface UseRadioTabSwitchingProps {
  messages: RadioMessage[];
  isAutoAdvanceEnabled: boolean;
  isAudioPlaying: boolean;
}

interface UseRadioTabSwitchingReturn {
  activeMessageId: string;
  setActiveMessageId: (id: string) => void;
  handleAudioEnd: () => void;
  unseenMessagesQueue: string[];
}

export const useRadioTabSwitching = ({
  messages,
  isAutoAdvanceEnabled,
  isAudioPlaying
}: UseRadioTabSwitchingProps): UseRadioTabSwitchingReturn => {
  const [activeMessageId, setActiveMessageId] = useState(messages.length > 0 ? messages[0].id : '');
  const [unseenMessagesQueue, setUnseenMessagesQueue] = useState<string[]>([]);
  const seenMessagesRef = useRef<Set<string>>(new Set());
  const previousMessagesLengthRef = useRef(0);
  const lastHumanMessageIdRef = useRef<string>('');

  // Gestione nuovi messaggi
  useEffect(() => {
    if (messages.length <= previousMessagesLengthRef.current) return;

    const newMessages = messages.slice(previousMessagesLengthRef.current);
    console.log(`📨 [useRadioTabSwitching] ${newMessages.length} nuovi messaggi ricevuti`);
    console.log(`📊 [useRadioTabSwitching] Stato corrente:`, {
      activeMessageId,
      isAudioPlaying,
      unseenQueueLength: unseenMessagesQueue.length,
      seenMessagesCount: seenMessagesRef.current.size
    });

    newMessages.forEach((message) => {
      console.log(`🆕 [useRadioTabSwitching] Processando messaggio:`, {
        id: message.id.substring(0, 8),
        type: message.sender_type,
        name: message.sender_name,
        isAudioPlaying,
        isAutoAdvanceEnabled
      });

      // Messaggi HUMAN: sempre visibili immediatamente - PRIORITÀ ASSOLUTA
      if (message.sender_type === 'human') {
        console.log(`👤 [useRadioTabSwitching] Messaggio HUMAN ricevuto → Attivo IMMEDIATAMENTE`);
        console.log(`   - Message ID: ${message.id}`);
        console.log(`   - Sender: ${message.sender_name}`);
        console.log(`   - isAudioPlaying IGNORATO (era: ${isAudioPlaying})`);
        lastHumanMessageIdRef.current = message.id;
        setActiveMessageId(message.id);
        seenMessagesRef.current.add(message.id);
        
        if (isAudioPlaying) {
          console.warn(`⚠️ [useRadioTabSwitching] Audio era attivo, ma messaggio HUMAN ha priorità assoluta`);
        }
        console.log(`✅ [useRadioTabSwitching] Tab attivato su messaggio HUMAN`);
        return;
      }

      // Primo messaggio AI: attiva subito
      const isFirstAIMessage = seenMessagesRef.current.size === 0;
      if (isFirstAIMessage) {
        console.log(`🤖 [useRadioTabSwitching] Primo messaggio AI da ${message.sender_name} → Attivo subito`);
        setActiveMessageId(message.id);
        seenMessagesRef.current.add(message.id);
        return;
      }

      // Audio NON attivo: attiva subito
      if (!isAudioPlaying) {
        console.log(`🤖 [useRadioTabSwitching] Audio non attivo → Attivo ${message.sender_name} subito`);
        setActiveMessageId(message.id);
        seenMessagesRef.current.add(message.id);
        return;
      }

      // Audio attivo: aggiungi a coda NON VISTI
      if (!seenMessagesRef.current.has(message.id)) {
        console.log(`⏳ [useRadioTabSwitching] Audio attivo → ${message.sender_name} aggiunto in coda`);
        console.log(`   - Queue length PRIMA: ${unseenMessagesQueue.length}`);
        setUnseenMessagesQueue((prev) => {
          const newQueue = [...prev, message.id];
          console.log(`   - Queue length DOPO: ${newQueue.length}`);
          return newQueue;
        });
      }
    });

    previousMessagesLengthRef.current = messages.length;
  }, [messages, isAudioPlaying, activeMessageId, unseenMessagesQueue.length, isAutoAdvanceEnabled]);

  // Handle audio end: passa al prossimo messaggio se auto-advance è attivo
  const handleAudioEnd = useCallback(() => {
    console.log('🎬 [useRadioTabSwitching] handleAudioEnd chiamato');
    console.log(`   - Auto-advance enabled: ${isAutoAdvanceEnabled}`);
    console.log(`   - Queue length: ${unseenMessagesQueue.length}`);
    console.log(`   - Active message: ${activeMessageId}`);

    // Se auto-advance è disabilitato, non fare nulla
    if (!isAutoAdvanceEnabled) {
      console.log('⏸️ [useRadioTabSwitching] Auto-advance disabilitato, nessun cambio');
      return;
    }

    // Se ci sono messaggi in coda, passa al primo
    if (unseenMessagesQueue.length > 0) {
      const nextMessageId = unseenMessagesQueue[0];
      console.log(`➡️ [useRadioTabSwitching] Passo al messaggio in coda: ${nextMessageId}`);
      
      setActiveMessageId(nextMessageId);
      seenMessagesRef.current.add(nextMessageId);
      
      setUnseenMessagesQueue((prev) => {
        const newQueue = prev.slice(1);
        console.log(`   - Rimosso dalla coda. Nuova lunghezza: ${newQueue.length}`);
        return newQueue;
      });
      return;
    }

    // Altrimenti passa al messaggio successivo in ordine
    const currentIndex = messages.findIndex(m => m.id === activeMessageId);
    if (currentIndex >= 0 && currentIndex < messages.length - 1) {
      const nextMessage = messages[currentIndex + 1];
      
      // 🔴 SAFETY: Se il prossimo messaggio è HUMAN, NON CAMBIARE
      if (nextMessage.sender_type === 'human') {
        console.log(`🛑 [useRadioTabSwitching] Prossimo è HUMAN, NON cambio automaticamente`);
        return;
      }
      
      console.log(`➡️ [useRadioTabSwitching] Passo al messaggio successivo: ${nextMessage.id}`);
      setActiveMessageId(nextMessage.id);
      seenMessagesRef.current.add(nextMessage.id);
    } else {
      console.log('🏁 [useRadioTabSwitching] Nessun altro messaggio disponibile');
    }
  }, [messages, activeMessageId, unseenMessagesQueue, isAutoAdvanceEnabled]);

  return {
    activeMessageId,
    setActiveMessageId,
    handleAudioEnd,
    unseenMessagesQueue
  };
};
