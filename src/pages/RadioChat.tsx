import { useState } from 'react';
import { Menu } from 'lucide-react';
import { RadioSidebar } from '@/components/radio-chat/RadioSidebar';
import { RadioMessageInput } from '@/components/radio-chat/RadioMessageInput';
import { RadioSendButton } from '@/components/radio-chat/RadioSendButton';

const RadioChat = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    
    console.log('📤 Sending message:', inputValue);
    // TODO: Implementare logica di invio messaggio
    
    setInputValue('');
  };

  return (
    <div className="min-h-screen relative">
      {/* Sidebar Trigger */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-40 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
      >
        <Menu className="w-6 h-6 text-white" />
      </button>

      {/* Sidebar */}
      <RadioSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content - Input al centro */}
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
