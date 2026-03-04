import { useState, useEffect, useRef, useCallback } from 'react';

interface Message {
  id: string;
  sender_type: 'human' | 'chatgpt' | 'gemini' | 'claude';
  sender_name: string;
  conversation_id?: string;
}

interface UseTabSwitchingProps {
  messages: Message[];
  isAutoFollowEnabled: boolean;
  isAudioPlaying: boolean;
  conversationId?: string | null;
}

interface UseTabSwitchingReturn {
  activeTab: string;
  setActiveTab: (id: string) => void;
  handleAudioEnd: () => void;
  unseenMessagesQueue: string[];
}

export const useTabSwitching = ({
  messages,
  isAutoFollowEnabled,
  isAudioPlaying,
  conversationId
}: UseTabSwitchingProps): UseTabSwitchingReturn => {
  const [activeTab, setActiveTab] = useState(messages.length > 0 ? messages[0].id : '');
  const [unseenMessagesQueue, setUnseenMessagesQueue] = useState<string[]>([]);
  const seenMessagesRef = useRef<Set<string>>(new Set());
  const previousMessagesLengthRef = useRef(0);

  // 🔴 FASE 3: Reset completo al cambio conversazione
  useEffect(() => {
    console.log(`🔄 [useTabSwitching] Conversation changed, full reset`);
    setActiveTab('');
    setUnseenMessagesQueue([]);
    seenMessagesRef.current.clear();
    previousMessagesLengthRef.current = 0;
  }, [conversationId]);

  // 🎯 Gestione nuovi messaggi
  useEffect(() => {
    if (messages.length <= previousMessagesLengthRef.current) return;

    const newMessages = messages.slice(previousMessagesLengthRef.current);
    console.log(`📨 [useTabSwitching] ${newMessages.length} nuovi messaggi ricevuti`);

    newMessages.forEach((message) => {
      // 🔴 FASE 3: Escludi messaggi HUMAN dalla coda audio automatica
      if (message.sender_type === 'human') {
        console.log(`👤 [useTabSwitching] Messaggio HUMAN ${message.sender_name} — skip coda audio`);
        seenMessagesRef.current.add(message.id);
        // Se nessun tab attivo, mostra comunque il messaggio human
        if (!activeTab) {
          setActiveTab(message.id);
        }
        return;
      }

      // Primo messaggio AI in assoluto: attiva subito
      const hasSeenAny = Array.from(seenMessagesRef.current).some(id => {
        const msg = messages.find(m => m.id === id);
        return msg && msg.sender_type !== 'human';
      });

      if (!hasSeenAny) {
        console.log(`🎬 [useTabSwitching] Primo messaggio AI → Attivo subito: ${message.sender_name}`);
        setActiveTab(message.id);
        seenMessagesRef.current.add(message.id);
        return;
      }

      // Audio NON attivo: attiva subito
      if (!isAudioPlaying) {
        console.log(`▶️ [useTabSwitching] Audio fermo → Attivo ${message.sender_name} subito`);
        setActiveTab(message.id);
        seenMessagesRef.current.add(message.id);
        return;
      }

      // Audio attivo: AI messages vanno in coda
      if (!seenMessagesRef.current.has(message.id)) {
        console.log(`⏳ [useTabSwitching] Audio attivo → ${message.sender_name} IN CODA`);
        setUnseenMessagesQueue((prev) => [...prev, message.id]);
        return;
      }
    });

    previousMessagesLengthRef.current = messages.length;
  }, [messages, isAudioPlaying]);

  // 🔴 FASE 3: Quando audio finisce, passa al PRIMO messaggio AI NON VISTO
  const handleAudioEnd = useCallback(() => {
    if (!isAutoFollowEnabled) {
      console.log(`⏹️ [handleAudioEnd] AutoFollow disabilitato, skip cambio tab`);
      return;
    }

    console.log(`🎵 [handleAudioEnd] Audio ended. Queue: ${unseenMessagesQueue.length}, activeTab: ${activeTab.substring(0, 8)}`);

    if (unseenMessagesQueue.length > 0) {
      const nextMessageId = unseenMessagesQueue[0];
      const nextMessage = messages.find((m) => m.id === nextMessageId);

      if (nextMessage) {
        console.log(`✅ [handleAudioEnd] Prossimo dalla coda: ${nextMessage.sender_name}`);
        setActiveTab(nextMessageId);
        seenMessagesRef.current.add(nextMessageId);
        setUnseenMessagesQueue((prev) => prev.slice(1));
      }
    } else {
      // Nessun messaggio in coda: passa al successivo AI nell'ordine
      const currentIndex = messages.findIndex((m) => m.id === activeTab);
      // Find next AI message after current
      for (let i = currentIndex + 1; i < messages.length; i++) {
        if (messages[i].sender_type !== 'human') {
          console.log(`✅ [handleAudioEnd] Prossimo sequenziale AI: ${messages[i].sender_name}`);
          setActiveTab(messages[i].id);
          seenMessagesRef.current.add(messages[i].id);
          return;
        }
      }
      console.log(`⏹️ [handleAudioEnd] Nessun altro messaggio AI da mostrare`);
    }
  }, [unseenMessagesQueue, messages, activeTab, isAutoFollowEnabled]);

  return {
    activeTab,
    setActiveTab,
    handleAudioEnd,
    unseenMessagesQueue
  };
};
