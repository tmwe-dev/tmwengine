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
    const timestamp = new Date().toISOString();
    console.log(`🎬 [RadioMessagesView] onAudioEndComplete chiamato @ ${timestamp}`);
    console.log(`   - activeTab prima del cambio: ${activeTab.substring(0, 8)}`);
    audioEnd(); // Setta isAudioPlaying = false
    
    // ✅ Delay 200ms per garantire cleanup completo di AudioMessagePlayer
    // (pause, removeEventListener, unmount)
    setTimeout(() => {
      console.log(`⏱️ [RadioMessagesView] Delay completato, settando shouldSwitchTab @ ${new Date().toISOString()}`);
      setShouldSwitchTab(true);
    }, 200);
  };

  // 🎯 Effetto: cambia tab DOPO che isAudioPlaying è aggiornato
  useEffect(() => {
    if (shouldSwitchTab && !isAudioPlaying) {
      const timestamp = new Date().toISOString();
      console.log(`🔄 [RadioMessagesView] Sincronizzazione completata @ ${timestamp}`);
      console.log(`   - isAudioPlaying: ${isAudioPlaying}`);
      console.log(`   - Chiamando tabSwitchOnAudioEnd()`);
      tabSwitchOnAudioEnd();
      setShouldSwitchTab(false);
      console.log(`✅ [RadioMessagesView] setActiveTab completato @ ${new Date().toISOString()}`);
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
          const isActive = message.id === activeTab;
          
          // ✅ CHIAVE: smonta i componenti non attivi
          if (!isActive) return null;
          
          return (
            <div key={message.id}>
              <MultiAgentMessage
                message={message}
                canAutoPlay={isActive}
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
