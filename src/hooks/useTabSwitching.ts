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
  const lastHumanMessageIdRef = useRef<string | null>(null);

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

      // Messaggi HUMAN: sempre visibili immediatamente - PRIORITÀ ASSOLUTA
      if (message.sender_type === 'human') {
        console.log(`👤 [useTabSwitching] Messaggio HUMAN ricevuto → Attivo IMMEDIATAMENTE`);
        console.log(`   - Message ID: ${message.id}`);
        console.log(`   - Sender: ${message.sender_name}`);
        console.log(`   - isAudioPlaying IGNORATO (era: ${isAudioPlaying})`);
        lastHumanMessageIdRef.current = message.id; // 🔴 MARKER HUMAN
        setActiveTab(message.id);
        seenMessagesRef.current.add(message.id);
        
        // ✅ SAFETY: Se audio era attivo, notifica ma NON bloccare
        if (isAudioPlaying) {
          console.warn(`⚠️ [useTabSwitching] Audio era attivo, ma messaggio HUMAN ha priorità assoluta`);
        }
        console.log(`✅ [useTabSwitching] Tab attivato su messaggio HUMAN`);
        return;
      }

      // Primo messaggio AI: attiva subito
      const isFirstAIMessage = seenMessagesRef.current.size === 0;
      if (isFirstAIMessage) {
        console.log(`🤖 [useTabSwitching] Primo messaggio AI da ${message.sender_name} → Attivo subito`);
        setActiveTab(message.id);
        seenMessagesRef.current.add(message.id);
        return;
      }

      // Audio NON attivo: attiva subito
      if (!isAudioPlaying) {
        console.log(`🤖 [useTabSwitching] Audio non attivo → Attivo ${message.sender_name} subito`);
        setActiveTab(message.id);
        seenMessagesRef.current.add(message.id);
        return;
      }

      // Audio attivo: aggiungi a coda NON VISTI
      if (!seenMessagesRef.current.has(message.id)) {
        console.log(`⏳ [useTabSwitching] Audio attivo → ${message.sender_name} aggiunto in coda`);
        console.log(`   - Queue length PRIMA: ${unseenMessagesQueue.length}`);
        setUnseenMessagesQueue((prev) => {
          const newQueue = [...prev, message.id];
          console.log(`   - Queue length DOPO: ${newQueue.length}`);
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
    console.log(`   - lastHumanMessageId:`, lastHumanMessageIdRef.current);
    console.log(`   - messages.length:`, messages.length);
    console.log(`   - seenMessages:`, Array.from(seenMessagesRef.current));

    // 🔴 PROTEZIONE: Non cambiare tab se è un messaggio HUMAN
    if (activeTab === lastHumanMessageIdRef.current) {
      console.log(`🛡️ [handleAudioEnd] Tab corrente è HUMAN → NON cambio tab`);
      lastHumanMessageIdRef.current = null; // Reset marker
      return;
    }

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
