import { useState, useEffect } from 'react';
import { useRadioConversation } from './useRadioConversation';
import { useRadioMessages } from './useRadioMessages';
import { useRadioOrchestrator } from './useRadioOrchestrator';

export function useRadioChat() {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const { conversationId, createConversation, isLoading: isCreating } = useRadioConversation();
  const { messages, saveUserMessage, isLoading: isLoadingMessages } = useRadioMessages(conversationId);
  const { invokeOrchestrator, isLoading: isOrchestrating } = useRadioOrchestrator();

  useEffect(() => {
    // Initialize conversation on mount
    const init = async () => {
      if (!conversationId) {
        await createConversation();
      }
    };
    init();
  }, []);

  const sendMessage = async () => {
    if (!inputValue.trim() || !conversationId) return false;

    const userMessage = inputValue.trim();
    setInputValue('');

    // Save user message
    const savedMessage = await saveUserMessage(userMessage);
    if (!savedMessage) return false;

    // Invoke orchestrator
    await invokeOrchestrator(conversationId, userMessage);
    
    return true;
  };

  const isLoading = isCreating || isLoadingMessages || isOrchestrating;

  return {
    inputValue,
    setInputValue,
    isFocused,
    setIsFocused,
    messages,
    sendMessage,
    isLoading,
    conversationId,
  };
}
