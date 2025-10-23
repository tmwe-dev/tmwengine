import { useState, useEffect } from 'react';
import { RadioCursor } from '@/components/radio-chat/RadioCursor';
import { RadioMessageInput } from '@/components/radio-chat/RadioMessageInput';
import { RadioSendButton } from '@/components/radio-chat/RadioSendButton';
import { RadioMessageList } from '@/components/radio-chat/RadioMessageList';
import { RadioSidebarTrigger } from '@/components/radio-chat/RadioSidebarTrigger';
import { RadioSidebar } from '@/components/radio-chat/RadioSidebar';
import { RadioMessageIcons } from '@/components/radio-chat/RadioMessageIcons';
import { useRadioChat } from '@/hooks/radio/useRadioChat';

const RadioChat = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showTextarea, setShowTextarea] = useState(false);

  const {
    inputValue,
    setInputValue,
    isFocused,
    setIsFocused,
    messages,
    sendMessage,
    isLoading,
    conversationId,
  } = useRadioChat();

  useEffect(() => {
    if (conversationId) {
      console.log('✅ Conversation ready, showing textarea');
      setShowTextarea(true);
    }
  }, [conversationId]);

  // Reset textarea quando il messaggio viene inviato
  useEffect(() => {
    if (messages.length > 0 && inputValue === '') {
      console.log('🔄 Message sent, hiding textarea');
      setShowTextarea(false);
      // Riattiva dopo un breve delay per permettere il nuovo input
      setTimeout(() => {
        setShowTextarea(true);
      }, 100);
    }
  }, [messages.length, inputValue]);

  const handleSend = async () => {
    console.log('🎯 handleSend called - Button clicked!');
    console.log('📝 inputValue before send:', inputValue);
    
    if (!inputValue.trim()) {
      console.log('❌ Empty input, aborting');
      return;
    }
    
    console.log('🔒 Sending message...');
    const success = await sendMessage();
    console.log('✅ sendMessage result:', success);
  };

  const handleIconClick = (messageId: string) => {
    console.log('Icon clicked:', messageId);
    // TODO: Show message as card
  };

  const handleCursorClick = () => {
    console.log('🖱️ Cursor clicked');
    if (conversationId && !isLoading) {
      setShowTextarea(true);
      setIsFocused(true);
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Sidebar Trigger */}
      <RadioSidebarTrigger 
        isOpen={sidebarOpen} 
        onToggle={() => setSidebarOpen(!sidebarOpen)} 
      />

      {/* Sidebar */}
      <RadioSidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />

      {/* Message Icons on the right */}
      <RadioMessageIcons 
        messages={messages} 
        onIconClick={handleIconClick}
      />

      {/* Main Content */}
      <div className="flex flex-col items-center justify-end min-h-screen px-4 pb-12">
        
        {/* Message List */}
        {messages.length > 0 && (
          <RadioMessageList messages={messages} isLoading={isLoading} />
        )}

        {/* Input Area */}
        <div className="relative w-full max-w-2xl">
          {/* Cursore animato - mostrato solo quando textarea nascosta o vuota */}
          {(!showTextarea || (showTextarea && inputValue.length === 0)) && (
            <RadioCursor 
              isActive={conversationId !== null && !isLoading} 
              isFocused={showTextarea ? isFocused : false}
              conversationId={conversationId}
              onClick={handleCursorClick}
            />
          )}

          {/* Input - mostrato solo se showTextarea è true */}
          {showTextarea && (
            <RadioMessageInput
              value={inputValue}
              onChange={setInputValue}
              onSubmit={handleSend}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              disabled={isLoading}
            />
          )}

          {/* Send Button */}
          <RadioSendButton 
            onSend={handleSend} 
            disabled={isLoading || !inputValue.trim()}
            visible={showTextarea && inputValue.trim().length > 0}
          />
        </div>
      </div>
    </div>
  );
};

export default RadioChat;
