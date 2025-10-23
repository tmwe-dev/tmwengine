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
        console.log('🚀 Initializing conversation...');
        await createConversation();
        console.log('✅ Conversation initialized');
      }
    };
    init();
  }, []);

  const sendMessage = async () => {
    console.log('🚀 sendMessage called');
    console.log('📝 inputValue:', inputValue);
    console.log('🆔 conversationId:', conversationId);
    
    if (!inputValue.trim() || !conversationId) {
      console.log('❌ Validation failed:', { 
        hasInput: !!inputValue.trim(), 
        hasConversationId: !!conversationId 
      });
      return false;
    }

    const userMessage = inputValue.trim();
    setInputValue('');

    console.log('💾 Saving message:', userMessage);
    const savedMessage = await saveUserMessage(userMessage);
    console.log('✅ Message saved:', savedMessage);
    
    if (!savedMessage) {
      console.log('❌ saveUserMessage returned null');
      return false;
    }

    console.log('🎭 Invoking orchestrator...');
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
