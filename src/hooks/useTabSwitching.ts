import { useState, useEffect, useRef, useCallback } from 'react';

interface Message {
  id: string;
  sender_type: 'human' | 'chatgpt' | 'gemini' | 'claude';
  sender_name: string;
}

interface UseTabSwitchingProps {
  messages: Message[];
  isAutoFollowEnabled: boolean;
  isAudioPlaying: boolean;
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
  isAudioPlaying
}: UseTabSwitchingProps): UseTabSwitchingReturn => {
  const [activeTab, setActiveTab] = useState(messages.length > 0 ? messages[0].id : '');
  const [unseenMessagesQueue, setUnseenMessagesQueue] = useState<string[]>([]);
  const seenMessagesRef = useRef<Set<string>>(new Set());
  const previousMessagesLengthRef = useRef(0);

  // 🎯 Gestione nuovi messaggi
  useEffect(() => {
    if (messages.length <= previousMessagesLengthRef.current) return;

    const newMessages = messages.slice(previousMessagesLengthRef.current);
    console.log(`📨 [useTabSwitching] ${newMessages.length} nuovi messaggi ricevuti`);
    console.log(`📊 [useTabSwitching] Stato corrente:`, {
      activeTab,
      isAudioPlaying,
      unseenQueueLength: unseenMessagesQueue.length,
      seenMessagesCount: seenMessagesRef.current.size
    });

    newMessages.forEach((message) => {
      console.log(`🆕 [useTabSwitching] Processando messaggio:`, {
        id: message.id.substring(0, 8),
        type: message.sender_type,
        name: message.sender_name,
        isAudioPlaying,
        currentActiveTab: activeTab.substring(0, 8),
        queueSize: unseenMessagesQueue.length
      });

      // ✅ LOGICA UNIFICATA: Tutti i messaggi (HUMAN e AI) seguono le stesse regole
      console.log(`🆕 [useTabSwitching] Nuovo messaggio da ${message.sender_name} (${message.sender_type})`);

      // Primo messaggio in assoluto: attiva subito
      const isFirstMessage = seenMessagesRef.current.size === 0;
      if (isFirstMessage) {
        console.log(`🎬 [useTabSwitching] Primo messaggio → Attivo subito`);
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

      // Audio attivo: TUTTI vanno in coda (HUMAN incluso)
      if (!seenMessagesRef.current.has(message.id)) {
        console.log(`⏳ [useTabSwitching] Audio attivo → ${message.sender_name} AGGIUNTO IN CODA`);
        console.log(`   - Tipo: ${message.sender_type}`);
        console.log(`   - Queue PRIMA: ${unseenMessagesQueue.length}`);
        setUnseenMessagesQueue((prev) => {
          const newQueue = [...prev, message.id];
          console.log(`   - Queue DOPO: ${newQueue.length}`);
          return newQueue;
        });
      }
    });

    previousMessagesLengthRef.current = messages.length;
  }, [messages, isAudioPlaying]);

  // 🎯 Quando audio finisce, passa al PRIMO messaggio NON VISTO
  const handleAudioEnd = useCallback(() => {
    console.log(`🎵 [handleAudioEnd] CHIAMATO`);
    console.log(`   - unseenMessagesQueue:`, unseenMessagesQueue);
    console.log(`   - unseenMessagesQueue.length:`, unseenMessagesQueue.length);
    console.log(`   - activeTab:`, activeTab);
    console.log(`   - messages.length:`, messages.length);
    console.log(`   - seenMessages:`, Array.from(seenMessagesRef.current));

    if (unseenMessagesQueue.length > 0) {
      const nextMessageId = unseenMessagesQueue[0];
      const nextMessage = messages.find((m) => m.id === nextMessageId);

      if (nextMessage) {
        console.log(`✅ Prossimo messaggio dalla coda: ${nextMessage.sender_name}`);
        setActiveTab(nextMessageId);
        seenMessagesRef.current.add(nextMessageId);
        setUnseenMessagesQueue((prev) => prev.slice(1)); // Rimuovi dalla coda
      }
    } else {
      // Nessun messaggio in coda: passa al successivo nell'ordine
      const currentIndex = messages.findIndex((m) => m.id === activeTab);
      const nextMessage = messages[currentIndex + 1];

      if (nextMessage) {
        console.log(`✅ Prossimo messaggio sequenziale: ${nextMessage.sender_name}`);
        setActiveTab(nextMessage.id);
        seenMessagesRef.current.add(nextMessage.id);
      } else {
        console.log(`⏹️ Nessun altro messaggio da mostrare`);
      }
    }
  }, [unseenMessagesQueue, messages, activeTab]);

  return {
    activeTab,
    setActiveTab,
    handleAudioEnd,
    unseenMessagesQueue
  };
};
