import { useState, useEffect, useRef, useCallback, useReducer } from 'react';

interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'human' | 'chatgpt' | 'gemini' | 'claude';
  sender_name: string;
  content: string;
  is_visible_to_ai: boolean;
  created_at: string;
}

interface UseTabSwitchingProps {
  messages: Message[];
  isAutoFollowEnabled: boolean;
  isAudioPlaying: boolean;
}

interface UseTabSwitchingReturn {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  handleAudioEnd: () => void;
  unseenMessagesQueue: string[];
}

// ✅ FIX P6: Reducer per gestione atomica della queue (elimina race condition)
type QueueAction = 
  | { type: 'ADD'; messageId: string }
  | { type: 'REMOVE_FIRST' }
  | { type: 'CLEAR' };

const queueReducer = (state: string[], action: QueueAction): string[] => {
  switch (action.type) {
    case 'ADD':
      return state.includes(action.messageId) ? state : [...state, action.messageId];
    case 'REMOVE_FIRST':
      return state.slice(1);
    case 'CLEAR':
      return [];
    default:
      return state;
  }
};

export const useTabSwitching = ({
  messages,
  isAutoFollowEnabled,
  isAudioPlaying
}: UseTabSwitchingProps): UseTabSwitchingReturn => {
  const [activeTab, setActiveTab] = useState<string>('');
  const [unseenMessagesQueue, dispatchQueue] = useReducer(queueReducer, []); // ✅ FIX P6
  
  const seenMessagesRef = useRef<Set<string>>(new Set());
  const previousMessagesLengthRef = useRef(0);
  const lastHumanMessageIdRef = useRef<string | null>(null);
  const messagesMapRef = useRef<Map<string, number>>(new Map()); // ✅ FIX P13: O(1) lookup
  const autoResetTimerRef = useRef<NodeJS.Timeout | null>(null); // ✅ FIX P8

  // ✅ FIX P13: Aggiorna Map per O(1) lookup
  useEffect(() => {
    messagesMapRef.current = new Map(messages.map((m, i) => [m.id, i]));
  }, [messages]);

  // ✅ FIX P7: Reset seenMessagesRef su conversation reset
  useEffect(() => {
    if (messages.length < previousMessagesLengthRef.current) {
      console.log(`🔄 [useTabSwitching] Conversation reset detected, clearing seenMessages`);
      seenMessagesRef.current.clear();
      dispatchQueue({ type: 'CLEAR' });
      lastHumanMessageIdRef.current = null;
    }
    previousMessagesLengthRef.current = messages.length;
  }, [messages.length]);

  // ✅ FIX P5: Dependencies complete + P14: cleanup
  useEffect(() => {
    if (!isAutoFollowEnabled || messages.length === 0) return;

    const newMessages = messages.filter(msg => !seenMessagesRef.current.has(msg.id));
    if (newMessages.length === 0) return;

    console.log(`🆕 [useTabSwitching] Nuovi messaggi rilevati: ${newMessages.length}`);

    // 🔴 PRIORITÀ 1: Messaggi HUMAN (sempre switch immediato)
    const humanMessages = newMessages.filter(msg => msg.sender_type === 'human');
    if (humanMessages.length > 0) {
      const latestHuman = humanMessages[humanMessages.length - 1];
      console.log(`👤 [useTabSwitching] HUMAN message detected, switch immediato a ${latestHuman.id}`);
      setActiveTab(latestHuman.id);
      lastHumanMessageIdRef.current = latestHuman.id;
      
      // ✅ FIX P8: Auto-reset dopo 5 secondi
      if (autoResetTimerRef.current) clearTimeout(autoResetTimerRef.current);
      autoResetTimerRef.current = setTimeout(() => {
        console.log(`⏰ [useTabSwitching] Auto-reset lastHumanMessageIdRef`);
        lastHumanMessageIdRef.current = null;
      }, 5000);

      humanMessages.forEach(msg => seenMessagesRef.current.add(msg.id));
      return;
    }

    // 🔴 PRIORITÀ 2: Primo messaggio AI (switch immediato)
    const aiMessages = newMessages.filter(msg => msg.sender_type !== 'human');
    const isFirstAIMessage = seenMessagesRef.current.size === 0 || 
      (seenMessagesRef.current.size === 1 && lastHumanMessageIdRef.current !== null);

    if (isFirstAIMessage && aiMessages.length > 0) {
      const firstAI = aiMessages[0];
      console.log(`🤖 [useTabSwitching] Primo AI message, switch immediato a ${firstAI.id}`);
      setActiveTab(firstAI.id);
      seenMessagesRef.current.add(firstAI.id);
      return;
    }

    // 🔴 PRIORITÀ 3: Messaggi AI successivi
    aiMessages.forEach(msg => {
      if (msg.is_visible_to_ai) { // ✅ FIX P11: Skip messaggi non visibili
        if (!isAudioPlaying) {
          console.log(`🤖 [useTabSwitching] AI message + audio NON playing, switch immediato a ${msg.id}`);
          setActiveTab(msg.id);
        } else {
          console.log(`⏸️ [useTabSwitching] Audio playing, accodo ${msg.id}`);
          dispatchQueue({ type: 'ADD', messageId: msg.id });
        }
        seenMessagesRef.current.add(msg.id);
      }
    });
  }, [messages, isAutoFollowEnabled, isAudioPlaying]); // ✅ FIX P5: Dependencies complete

  // ✅ FIX P13: Memoizzare handleAudioEnd
  const handleAudioEnd = useCallback(() => {
    console.log(`🎬 [useTabSwitching] handleAudioEnd chiamato`);
    console.log(`📋 [useTabSwitching] unseenMessagesQueue:`, unseenMessagesQueue);

    // 🔴 SAFEGUARD: Non switchare se siamo su un messaggio HUMAN
    const currentMessage = messages.find(m => m.id === activeTab);
    if (currentMessage?.sender_type === 'human') {
      console.log(`⚠️ [useTabSwitching] Safeguard: non switcho da messaggio HUMAN`);
      return;
    }

    // 🔴 CASO 1: C'è qualcosa in coda → switcha al primo in coda
    if (unseenMessagesQueue.length > 0) {
      const nextMessageId = unseenMessagesQueue[0];
      console.log(`✅ [useTabSwitching] Switch al prossimo in coda: ${nextMessageId}`);
      setActiveTab(nextMessageId);
      dispatchQueue({ type: 'REMOVE_FIRST' });
      return;
    }

    // 🔴 CASO 2: Coda vuota → vai al prossimo sequenziale
    const currentIndex = messagesMapRef.current.get(activeTab) ?? -1; // ✅ FIX P13: O(1)
    const nextMessage = messages[currentIndex + 1];

    if (nextMessage) {
      console.log(`✅ [useTabSwitching] Switch al prossimo sequenziale: ${nextMessage.id}`);
      setActiveTab(nextMessage.id);
      seenMessagesRef.current.add(nextMessage.id);
    } else {
      console.log(`ℹ️ [useTabSwitching] Nessun messaggio successivo disponibile`);
    }
  }, [unseenMessagesQueue, messages, activeTab]); // ✅ FIX P5

  // ✅ FIX P14: Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoResetTimerRef.current) clearTimeout(autoResetTimerRef.current);
    };
  }, []);

  return {
    activeTab,
    setActiveTab,
    handleAudioEnd,
    unseenMessagesQueue
  };
};
