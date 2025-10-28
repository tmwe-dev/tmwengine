import { useState, useEffect, useRef } from 'react';
import { MultiAgentMessage } from '@/components/chat-laboratory/MultiAgentMessage';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioMessage } from '@/types/radio';
import { useRadioAudioPlayback } from '@/hooks/useRadioAudioPlayback';
import { useRadioVirtualTabs } from '@/hooks/useRadioVirtualTabs';
import { cn } from '@/lib/utils';

interface RadioMessagesViewProps {
  messages: RadioMessage[];
  isAutoAdvanceEnabled?: boolean;
  isAudioEnabled?: boolean;
  isAudioPlaying?: boolean;
}

export function RadioMessagesView({ 
  messages,
  isAutoAdvanceEnabled = true,
  isAudioEnabled = true,
  isAudioPlaying: externalIsAudioPlaying
}: RadioMessagesViewProps) {
  // Hook per gestione stato audio
  const { 
    isAudioPlaying: internalIsAudioPlaying,
    handleAudioStart, 
    handleAudioEnd: audioEnd 
  } = useRadioAudioPlayback();

  // Usa lo stato audio esterno se fornito, altrimenti usa quello interno
  const isAudioPlaying = externalIsAudioPlaying ?? internalIsAudioPlaying;

  // Hook per tab virtuali (con isAudioPlaying propagato)
  const {
    activeMessageId,
    canAutoPlayForMessage,
    handleAudioEnd: tabSwitchOnAudioEnd
  } = useRadioVirtualTabs({
    messages,
    isAutoAdvanceEnabled,
    isAudioPlaying
  });

  // FIX 2: State per sincronizzazione audio-tab
  const [shouldSwitchTab, setShouldSwitchTab] = useState(false);

  // FIX 4: Ref per auto-scroll
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // FIX 2: Callback con delay per sincronizzazione perfetta
  const onAudioEndComplete = () => {
    audioEnd();
    setTimeout(() => {
      setShouldSwitchTab(true);
    }, 50);
  };

  // FIX 2: useEffect per sincronizzazione audio-tab
  useEffect(() => {
    if (shouldSwitchTab && !isAudioPlaying) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔄 [RadioMessagesView] Sincronizzazione completata, cambio tab`);
      }
      tabSwitchOnAudioEnd();
      setShouldSwitchTab(false);
    }
  }, [shouldSwitchTab, isAudioPlaying, tabSwitchOnAudioEnd]);

  // FIX 4: useEffect per auto-scroll al messaggio attivo
  useEffect(() => {
    if (activeMessageId) {
      const element = messageRefs.current.get(activeMessageId);
      if (element) {
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        });
      }
    }
  }, [activeMessageId]);

  // Convert RadioMessage to expected format for MultiAgentMessage
  const formattedMessages = messages.map(msg => {
    // Normalizza sender_type con mapping esplicito
    let normalizedSenderType: 'human' | 'chatgpt' | 'gemini' | 'claude';
    
    const rawSenderType = msg.sender_type as string;
    
    if (rawSenderType === 'human' || rawSenderType === 'user') {
      normalizedSenderType = 'human';
    } else if (rawSenderType === 'chatgpt' || rawSenderType === 'gemini' || rawSenderType === 'claude') {
      normalizedSenderType = rawSenderType as 'chatgpt' | 'gemini' | 'claude';
    } else {
      // Default AI a chatgpt se non riconosciuto
      normalizedSenderType = 'chatgpt';
    }
    
    return {
      ...msg,
      conversation_id: msg.conversation_id || '',
      is_visible_to_ai: msg.is_visible_to_ai ?? true,
      sender_type: normalizedSenderType
    };
  });

  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 [RadioMessagesView] DEBUG:', {
      totalMessages: formattedMessages.length,
      messagesWithAudio: formattedMessages.filter(m => m.audio_url).length,
      isAudioEnabled,
      activeMessageId: activeMessageId.substring(0, 8)
    });
  }

  return (
    <ScrollArea className="h-full px-4">
      <div className="space-y-4 pb-4 max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto">
        {formattedMessages.map((message) => {
          // 🎯 LOGICA TAB VIRTUALE: canAutoPlay basato su activeMessageId
          const canAutoPlay = canAutoPlayForMessage(message.id) && isAudioEnabled;
          
          if (message.audio_url && process.env.NODE_ENV === 'development') {
            console.log(`🎵 [RadioMessagesView] Render messaggio ${message.sender_name}:`, {
              messageId: message.id.substring(0, 8),
              isActive: message.id === activeMessageId,
              canAutoPlay,
              hasAudio: true,
              senderType: message.sender_type
            });
          }
          
          // FIX 3 + 4: Wrapper con animazione e ref per scroll
          return (
            <div 
              key={message.id}
              ref={(el) => {
                if (el) messageRefs.current.set(message.id, el);
              }}
              className={cn(
                "transition-all duration-300 ease-in-out",
                message.id === activeMessageId 
                  ? "opacity-100 scale-100" 
                  : "opacity-60 scale-[0.98]"
              )}
            >
              <MultiAgentMessage
                message={message}
                onAudioEnd={onAudioEndComplete}
                onAudioStateChange={(playing) => 
                  playing ? handleAudioStart(message.id) : audioEnd()
                }
                canAutoPlay={canAutoPlay}
              />
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
