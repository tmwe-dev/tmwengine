import { useState, useEffect, useRef } from 'react';

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

    newMessages.forEach((message) => {
      // Messaggi HUMAN: sempre visibili immediatamente
      if (message.sender_type === 'human') {
        console.log(`👤 Messaggio HUMAN → Attivo immediatamente`);
        setActiveTab(message.id);
        seenMessagesRef.current.add(message.id);
        return;
      }

      // Primo messaggio AI: attiva subito
      const isFirstAIMessage = seenMessagesRef.current.size === 0;
      if (isFirstAIMessage) {
        console.log(`🤖 Primo messaggio AI da ${message.sender_name} → Attivo subito`);
        setActiveTab(message.id);
        seenMessagesRef.current.add(message.id);
        return;
      }

      // Audio NON attivo: attiva subito
      if (!isAudioPlaying) {
        console.log(`🤖 Audio non attivo → Attivo ${message.sender_name} subito`);
        setActiveTab(message.id);
        seenMessagesRef.current.add(message.id);
        return;
      }

      // Audio attivo: aggiungi a coda NON VISTI
      if (!seenMessagesRef.current.has(message.id)) {
        console.log(`⏳ Audio attivo → ${message.sender_name} in coda`);
        setUnseenMessagesQueue((prev) => [...prev, message.id]);
      }
    });

    previousMessagesLengthRef.current = messages.length;
  }, [messages, isAudioPlaying]);

  // 🎯 Quando audio finisce, passa al PRIMO messaggio NON VISTO
  const handleAudioEnd = () => {
    console.log(`🎵 [useTabSwitching] Audio terminato. Coda non visti:`, unseenMessagesQueue);

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

      if (nextMessage && !seenMessagesRef.current.has(nextMessage.id)) {
        console.log(`✅ Prossimo messaggio sequenziale: ${nextMessage.sender_name}`);
        setActiveTab(nextMessage.id);
        seenMessagesRef.current.add(nextMessage.id);
      } else {
        console.log(`⏹️ Nessun altro messaggio da mostrare`);
      }
    }
  };

  return {
    activeTab,
    setActiveTab,
    handleAudioEnd,
    unseenMessagesQueue
  };
};
