import { useState, useEffect, useRef, useCallback } from 'react';
import { RadioMessage } from '@/types/radio';

interface UseRadioMessagesProps {
  messages: RadioMessage[];
  isAudioPlaying: boolean;
}

interface UseRadioMessagesReturn {
  activeMessageId: string;
  setActiveMessageId: (id: string) => void;
  handleAudioEnd: () => void;
  unseenMessagesQueue: string[];
  currentMessage?: RadioMessage;
}

export const useRadioMessages = ({
  messages,
  isAudioPlaying
}: UseRadioMessagesProps): UseRadioMessagesReturn => {
  const [activeMessageId, setActiveMessageId] = useState<string>('');
  const [unseenMessagesQueue, setUnseenMessagesQueue] = useState<string[]>([]);
  
  const seenMessagesRef = useRef<Set<string>>(new Set());
  const previousMessageCountRef = useRef(0);
  const lastHumanMessageIdRef = useRef<string>('');

  // Initialize with first AI message if exists
  useEffect(() => {
    if (activeMessageId === '' && messages.length > 0) {
      const firstAiMessage = messages.find(m => m.sender_type !== 'human');
      if (firstAiMessage) {
        setActiveMessageId(firstAiMessage.id);
        seenMessagesRef.current.add(firstAiMessage.id);
      }
    }
  }, [messages, activeMessageId]);

  useEffect(() => {
    if (messages.length === 0) return;

    const newMessages = messages.slice(previousMessageCountRef.current);
    previousMessageCountRef.current = messages.length;

    if (newMessages.length === 0) return;

    const humanMessage = newMessages.find(msg => msg.sender_type === 'human');
    
    if (humanMessage && !seenMessagesRef.current.has(humanMessage.id)) {
      setActiveMessageId(humanMessage.id);
      seenMessagesRef.current.add(humanMessage.id);
      lastHumanMessageIdRef.current = humanMessage.id;
      setUnseenMessagesQueue([]);
      return;
    }

    const aiMessages = newMessages.filter(msg => 
      msg.sender_type !== 'human' && !seenMessagesRef.current.has(msg.id)
    );

    if (aiMessages.length === 0) return;

    const isFirstMessage = messages.length === aiMessages.length;

    if (!isAudioPlaying || isFirstMessage) {
      const firstAiMessage = aiMessages[0];
      setActiveMessageId(firstAiMessage.id);
      seenMessagesRef.current.add(firstAiMessage.id);

      if (aiMessages.length > 1) {
        setUnseenMessagesQueue(prev => [
          ...prev,
          ...aiMessages.slice(1).map(msg => msg.id)
        ]);
      }
    } else {
      setUnseenMessagesQueue(prev => [
        ...prev,
        ...aiMessages.map(msg => msg.id)
      ]);
    }
  }, [messages, isAudioPlaying]);

  const handleAudioEnd = useCallback(() => {
    // AUTO-SWITCH DISABLED - Manual navigation only
    // User controls carousel navigation with swipe/buttons
    console.log('🎵 Audio ended - manual navigation mode');
  }, []);

  const currentMessage = messages.find(msg => msg.id === activeMessageId);

  useEffect(() => {
    console.log('🎯 useRadioMessages state:', {
      activeMessageId,
      currentMessage: currentMessage?.sender_name,
      totalMessages: messages.length,
      unseenQueue: unseenMessagesQueue.length,
      seenCount: seenMessagesRef.current.size
    });
  }, [activeMessageId, currentMessage, messages.length, unseenMessagesQueue.length]);

  return {
    activeMessageId,
    setActiveMessageId,
    handleAudioEnd,
    unseenMessagesQueue,
    currentMessage
  };
};
