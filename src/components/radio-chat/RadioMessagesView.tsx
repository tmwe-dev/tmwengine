import { useState, useEffect } from 'react';
import { MultiAgentMessage } from '@/components/chat-laboratory/MultiAgentMessage';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioMessage } from '@/types/radio';
import { useTabSwitching } from '@/hooks/useTabSwitching';
import { useAudioPlayback } from '@/hooks/useAudioPlayback';
import { cn } from '@/lib/utils';

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
  
  const { 
    isAudioPlaying, 
    handleAudioStart, 
    handleAudioEnd: audioEnd 
  } = useAudioPlayback();

  const {
    activeTab,
    setActiveTab,
    handleAudioEnd: tabSwitchOnAudioEnd
  } = useTabSwitching({
    messages,
    isAutoFollowEnabled: isAutoAdvanceEnabled,
    isAudioPlaying
  });

  const [shouldSwitchTab, setShouldSwitchTab] = useState(false);

  const onAudioEndComplete = () => {
    audioEnd();
    setTimeout(() => {
      setShouldSwitchTab(true);
    }, 200);
  };

  useEffect(() => {
    if (shouldSwitchTab && !isAudioPlaying) {
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
          const isActive = message.id === activeTab;
          
          return (
            <div 
              key={message.id}
              className={cn(
                "transition-all duration-300",
                isActive 
                  ? "ring-2 ring-primary/50 rounded-lg" 
                  : "opacity-70 hover:opacity-100"
              )}
              onClick={() => setActiveTab(message.id)}
            >
              <MultiAgentMessage
                message={message}
                canAutoPlay={isActive}
                isAudioPlayingGlobally={isAudioPlaying}
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
