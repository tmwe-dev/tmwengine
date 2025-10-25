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
    if (unseenMessagesQueue.length > 0) {
      const nextMessageId = unseenMessagesQueue[0];
      setActiveMessageId(nextMessageId);
      seenMessagesRef.current.add(nextMessageId);
      setUnseenMessagesQueue(prev => prev.slice(1));
    } else {
      const currentIndex = messages.findIndex(msg => msg.id === activeMessageId);
      if (currentIndex !== -1 && currentIndex < messages.length - 1) {
        const nextMessage = messages[currentIndex + 1];
        
        const currentMessage = messages[currentIndex];
        if (currentMessage.sender_type === 'human') {
          return;
        }

        if (!seenMessagesRef.current.has(nextMessage.id)) {
          setActiveMessageId(nextMessage.id);
          seenMessagesRef.current.add(nextMessage.id);
        }
      }
    }
  }, [unseenMessagesQueue, messages, activeMessageId]);

  const currentMessage = messages.find(msg => msg.id === activeMessageId);

  return {
    activeMessageId,
    setActiveMessageId,
    handleAudioEnd,
    unseenMessagesQueue,
    currentMessage
  };
};
