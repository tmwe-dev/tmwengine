import { useState, useEffect, useRef } from 'react';

interface Message {
  id: string;
  sender_type: 'human' | 'chatgpt' | 'gemini' | 'claude';
  sender_name: string;
}

interface UseTabSwitchingProps {
  messages: Message[];
}

interface UseTabSwitchingReturn {
  activeTab: string;
  setActiveTab: (id: string) => void;
}

export const useTabSwitching = ({
  messages
}: UseTabSwitchingProps): UseTabSwitchingReturn => {
  const [activeTab, setActiveTab] = useState(messages.length > 0 ? messages[0].id : '');
  const previousMessagesLengthRef = useRef(0);

  // Quando arriva un nuovo messaggio, attiva il suo tab
  useEffect(() => {
    if (messages.length > previousMessagesLengthRef.current) {
      const latestMessage = messages[messages.length - 1];
      console.log(`📨 [useTabSwitching] Nuovo messaggio da ${latestMessage.sender_name} → Attivo tab`);
      setActiveTab(latestMessage.id);
    }
    previousMessagesLengthRef.current = messages.length;
  }, [messages]);

  return {
    activeTab,
    setActiveTab
  };
};
