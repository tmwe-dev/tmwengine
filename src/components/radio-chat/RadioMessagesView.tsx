import { useState, useEffect } from 'react';
import { MultiAgentMessage } from '@/components/chat-laboratory/MultiAgentMessage';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioMessage } from '@/types/radio';
import { useTabSwitching } from '@/hooks/useTabSwitching';
import { useAudioPlayback } from '@/hooks/useAudioPlayback';

interface RadioMessagesViewProps {
  messages: RadioMessage[];
  isAutoAdvanceEnabled?: boolean;
  isAudioEnabled?: boolean;
}

export function RadioMessagesView({ 
  messages,
  isAutoAdvanceEnabled = true,
  isAudioEnabled = true
}: RadioMessagesViewProps) {
  
  // 🎯 Hook audio playback
  const { 
    isAudioPlaying, 
    handleAudioStart, 
    handleAudioEnd: audioEnd 
  } = useAudioPlayback();

  // 🎯 Hook tab switching con coda intelligente
  const {
    activeTab,
    setActiveTab,
    handleAudioEnd: tabSwitchOnAudioEnd
  } = useTabSwitching({
    messages,
    isAutoFollowEnabled: isAutoAdvanceEnabled,
    isAudioPlaying
  });

  // 🎯 State per sincronizzare tab switch dopo audio end
  const [shouldSwitchTab, setShouldSwitchTab] = useState(false);

  // 🎯 Callback completo: quando audio finisce
  const onAudioEndComplete = () => {
    console.log(`🎬 [RadioMessagesView] onAudioEndComplete chiamato`);
    audioEnd(); // Setta isAudioPlaying = false
    
    // Delay per assicurare sync
    setTimeout(() => {
      setShouldSwitchTab(true);
    }, 50);
  };

  // 🎯 Effetto: cambia tab DOPO che isAudioPlaying è aggiornato
  useEffect(() => {
    if (shouldSwitchTab && !isAudioPlaying) {
      console.log(`🔄 [RadioMessagesView] Sincronizzazione completata, cambio messaggio attivo`);
      tabSwitchOnAudioEnd();
      setShouldSwitchTab(false);
    }
  }, [shouldSwitchTab, isAudioPlaying, tabSwitchOnAudioEnd]);

  // Convert RadioMessage to expected format
  const formattedMessages = messages.map(msg => {
    let normalizedSenderType: 'human' | 'chatgpt' | 'gemini' | 'claude';
    const rawSenderType = msg.sender_type as string;
    
    if (rawSenderType === 'human' || rawSenderType === 'user') {
      normalizedSenderType = 'human';
    } else if (rawSenderType === 'chatgpt' || rawSenderType === 'gemini' || rawSenderType === 'claude') {
      normalizedSenderType = rawSenderType as 'chatgpt' | 'gemini' | 'claude';
    } else {
      normalizedSenderType = 'chatgpt';
    }
    
    return {
      ...msg,
      conversation_id: msg.conversation_id || '',
      is_visible_to_ai: msg.is_visible_to_ai ?? true,
      sender_type: normalizedSenderType
    };
  });

  return (
    <ScrollArea className="h-full px-4">
      <div className="space-y-4 pb-4 max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto">
        {formattedMessages.map((message) => {
          // ✅ CHIAVE: solo il messaggio attivo viene mostrato
          const isActive = message.id === activeTab;
          
          return (
            <div 
              key={message.id} 
              style={{ display: isActive ? 'block' : 'none' }}
            >
              <MultiAgentMessage
                message={message}
                onAudioEnd={onAudioEndComplete}
                onAudioStateChange={(playing) => playing ? handleAudioStart() : audioEnd()}
              />
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
