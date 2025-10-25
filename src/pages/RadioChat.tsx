import { useState } from 'react';
import { Menu } from 'lucide-react';
import { RadioSidebar } from '@/components/radio-chat/RadioSidebar';
import { RadioMessageInput } from '@/components/radio-chat/RadioMessageInput';
import { RadioSendButton } from '@/components/radio-chat/RadioSendButton';
import { RadioMessageView } from '@/components/radio-chat/RadioMessageView';
import { RadioCarousel3D } from '@/components/radio-chat/RadioCarousel3D';
import { useRadioMessages } from '@/hooks/useRadioMessages';
import { useAudioPlayback } from '@/hooks/useAudioPlayback';
import { RadioMessage } from '@/types/radio';

const RadioChat = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<RadioMessage[]>([]);
  
  const { isAudioPlaying, handleAudioStart, handleAudioEnd: audioEnd } = useAudioPlayback();
  
  const {
    activeMessageId,
    currentMessage,
    handleAudioEnd: messageSwitch,
    unseenMessagesQueue
  } = useRadioMessages({
    messages,
    isAudioPlaying
  });
  
  const onAudioEndComplete = () => {
    audioEnd();
    setTimeout(() => messageSwitch(), 50);
  };

  const handleCarouselRotationComplete = () => {
    setTimeout(() => handleAudioStart(), 200);
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    
    console.log('📤 Sending message:', inputValue);
    
    // Mock: aggiungi messaggio human
    const newMessage: RadioMessage = {
      id: `msg-${Date.now()}`,
      sender_type: 'human',
      sender_name: 'You',
      content: inputValue,
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInputValue('');
    
    // TODO: Chiamata a Supabase edge function per AI response
  };

  return (
    <div className="min-h-screen relative">
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-40 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
      >
        <Menu className="w-6 h-6 text-white" />
      </button>

      <RadioSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="pb-[30vh]">
        {/* 3D Carousel */}
        <RadioCarousel3D 
          messages={messages}
          activeMessageId={activeMessageId}
          onRotationComplete={handleCarouselRotationComplete}
        />
        
        {/* Message View */}
        {currentMessage && (
          <RadioMessageView
            message={currentMessage}
            onAudioEnd={onAudioEndComplete}
            onAudioStart={handleAudioStart}
          />
        )}
        
        {/* DEBUG INFO */}
        <div className="fixed top-20 right-4 bg-black/80 text-white text-xs p-4 rounded">
          <div>Active: {activeMessageId}</div>
          <div>Queue: {unseenMessagesQueue.length}</div>
          <div>Audio: {isAudioPlaying ? 'Playing' : 'Stopped'}</div>
          <div>Total messages: {messages.length}</div>
          <div>AI messages: {messages.filter(m => m.sender_type !== 'human').length}</div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-8 pb-12">
        <div className="w-full max-w-2xl mx-auto relative">
          <RadioMessageInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSend}
            disabled={false}
          />
          
          <RadioSendButton
            onSend={handleSend}
            disabled={!inputValue.trim()}
            visible={inputValue.trim().length > 0}
          />
        </div>
      </div>
    </div>
  );
};

export default RadioChat;
