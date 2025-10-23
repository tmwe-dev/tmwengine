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

  const handleSend = async () => {
    console.log('🎯 handleSend called - Button clicked!');
    console.log('📝 inputValue before send:', inputValue);
    console.log('🔒 Disabling interactions...');
    
    const success = await sendMessage();
    console.log('✅ sendMessage result:', success);
    
    if (success) {
      console.log('⏱️ Waiting for message to appear in list...');
      // Wait a bit for the subscription to update messages
      setTimeout(() => {
        console.log('🔄 Hiding textarea now');
        setShowTextarea(false);
      }, 500);
    }
  };

  const handleIconClick = (messageId: string) => {
    console.log('Icon clicked:', messageId);
    // TODO: Show message as card
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
          {/* Cursore animato - sempre visibile quando textarea nascosta */}
          {!showTextarea && !isLoading && (
            <RadioCursor 
              isActive={true} 
              isFocused={false}
              conversationId={conversationId}
            />
          )}

          {/* Input invisibile - mostrato solo se showTextarea è true */}
          {showTextarea && (
            <>
              {!isLoading && (
                <RadioCursor 
                  isActive={inputValue.length === 0} 
                  isFocused={isFocused}
                  conversationId={conversationId}
                />
              )}
              
              <RadioMessageInput
                value={inputValue}
                onChange={setInputValue}
                onSubmit={handleSend}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                disabled={isLoading}
              />
            </>
          )}

          {/* Send Button - Sempre renderizzato, visibilità gestita dal prop */}
          <RadioSendButton 
            onSend={handleSend} 
            disabled={isLoading}
            visible={showTextarea && !!inputValue}
          />
        </div>
      </div>
    </div>
  );
};

export default RadioChat;
