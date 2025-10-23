import { useState } from 'react';
import { RadioCursor } from '@/components/radio-chat/RadioCursor';
import { RadioMessageInput } from '@/components/radio-chat/RadioMessageInput';
import { RadioSendButton } from '@/components/radio-chat/RadioSendButton';
import { RadioMessageList } from '@/components/radio-chat/RadioMessageList';
import { RadioSidebarTrigger } from '@/components/radio-chat/RadioSidebarTrigger';
import { RadioSidebar } from '@/components/radio-chat/RadioSidebar';
import { useRadioChat } from '@/hooks/radio/useRadioChat';

const RadioChat = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const {
    inputValue,
    setInputValue,
    isFocused,
    setIsFocused,
    messages,
    sendMessage,
    isLoading,
  } = useRadioChat();

  return (
    <div className="min-h-screen bg-background relative">
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

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        
        {/* Message List */}
        {messages.length > 0 && (
          <RadioMessageList messages={messages} isLoading={isLoading} />
        )}

        {/* Input Area */}
        <div className="relative w-full max-w-2xl">
          {/* Cursore animato - visibile solo quando input vuoto e non in loading */}
          {!inputValue && !isLoading && (
            <RadioCursor isActive={isFocused} />
          )}

          {/* Input invisibile */}
          <RadioMessageInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={sendMessage}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={isLoading}
          />

          {/* Send Button */}
          {inputValue && (
            <RadioSendButton 
              onSend={sendMessage} 
              disabled={isLoading}
              visible={!!inputValue}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default RadioChat;
