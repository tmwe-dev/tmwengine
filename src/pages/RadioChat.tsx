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

      {/* Main Content */}
      <div className="flex flex-col items-center justify-end min-h-screen px-4 pb-12">
        
        {/* Message List */}
        {messages.length > 0 && (
          <RadioMessageList messages={messages} isLoading={isLoading} />
        )}

        {/* Input Area */}
        <div className="relative w-full max-w-2xl">
          {/* Cursore animato - sempre visibile, cambia solo animazione */}
          {!isLoading && (
            <RadioCursor isActive={!isFocused && !inputValue} />
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
