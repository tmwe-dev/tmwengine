import { MultiAgentMessage } from '@/components/chat-laboratory/MultiAgentMessage';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioMessage } from '@/types/radio';
import { useRadioAudioPlayback } from '@/hooks/useRadioAudioPlayback';
import { useRadioVirtualTabs } from '@/hooks/useRadioVirtualTabs';

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
  // Hook per gestione stato audio
  const { 
    isAudioPlaying,
    handleAudioStart, 
    handleAudioEnd: audioEnd 
  } = useRadioAudioPlayback();

  // Hook per tab virtuali (replica logica MessageTabsView)
  const {
    activeMessageId,
    canAutoPlayForMessage,
    handleAudioEnd: tabSwitchOnAudioEnd
  } = useRadioVirtualTabs({
    messages,
    isAutoAdvanceEnabled,
    isAudioPlaying
  });

  // Callback combinato: gestisce sia audio che cambio tab
  const onAudioEndComplete = () => {
    console.log('🎬 [RadioMessagesView] ═══ AUDIO COMPLETATO ═══');
    console.log('🎬 [RadioMessagesView] activeMessageId prima:', activeMessageId);
    audioEnd();
    console.log('🎬 [RadioMessagesView] Chiamata tabSwitchOnAudioEnd...');
    tabSwitchOnAudioEnd();
  };

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
  console.log('🔍 [RadioMessagesView] DEBUG:', {
    totalMessages: formattedMessages.length,
    messagesWithAudio: formattedMessages.filter(m => m.audio_url).length,
    isAudioEnabled,
    activeMessageId: activeMessageId.substring(0, 8)
  });

  return (
    <ScrollArea className="h-full px-4">
      <div className="space-y-4 pb-4 max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto">
        {formattedMessages.map((message) => {
          // 🎯 LOGICA TAB VIRTUALE: canAutoPlay basato su activeMessageId
          const canAutoPlay = canAutoPlayForMessage(message.id) && isAudioEnabled;
          
          if (message.audio_url) {
            console.log(`🎵 [RadioMessagesView] Render messaggio ${message.sender_name}:`, {
              messageId: message.id.substring(0, 8),
              isActive: message.id === activeMessageId,
              canAutoPlay,
              hasAudio: true,
              senderType: message.sender_type
            });
          }
          
          return (
            <MultiAgentMessage
              key={message.id}
              message={message}
              onAudioEnd={onAudioEndComplete}
              onAudioStateChange={(playing) => 
                playing ? handleAudioStart(message.id) : audioEnd()
              }
              canAutoPlay={canAutoPlay}
            />
          );
        })}
      </div>
    </ScrollArea>
  );
}
