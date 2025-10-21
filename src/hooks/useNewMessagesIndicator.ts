import { useState, useRef } from 'react';

interface UseNewMessagesIndicatorProps {
  isAutoFollowEnabled: boolean;
}

interface UseNewMessagesIndicatorReturn {
  showNewMessages: boolean;
  newMessagesCount: number;
  scrollToBottom: () => void;
  handleScroll: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  tabContentRef: React.RefObject<HTMLDivElement>;
}

export const useNewMessagesIndicator = ({
  isAutoFollowEnabled
}: UseNewMessagesIndicatorProps): UseNewMessagesIndicatorReturn => {
  const [showNewMessages, setShowNewMessages] = useState(false);
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const tabContentRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowNewMessages(false);
    setNewMessagesCount(0);
  };

  const handleScroll = () => {
    const container = tabContentRef.current;
    if (!container) return;

    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;

    if (isNearBottom && showNewMessages) {
      setShowNewMessages(false);
      setNewMessagesCount(0);
    }
  };

  return {
    showNewMessages,
    newMessagesCount,
    scrollToBottom,
    handleScroll,
    messagesEndRef,
    tabContentRef
  };
};
