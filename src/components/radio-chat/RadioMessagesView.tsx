import { MultiAgentMessage } from '@/components/chat-laboratory/MultiAgentMessage';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioMessage } from '@/types/radio';
import { useRadioAudioPlayback } from '@/hooks/useRadioAudioPlayback';
import { useRadioTabSwitching } from '@/hooks/useRadioTabSwitching';

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
  // Usa hooks dedicati per gestione audio e tab switching
  const { 
    isAudioPlaying,
    currentPlayingId, 
    handleAudioStart, 
    handleAudioEnd: audioEnd 
  } = useRadioAudioPlayback();

  const {
    handleAudioEnd: tabSwitchOnAudioEnd
  } = useRadioTabSwitching({
    messages,
    isAutoAdvanceEnabled,
    isAudioPlaying
  });

  const onAudioEndComplete = () => {
    audioEnd();
    if (isAutoAdvanceEnabled) {
      setTimeout(() => tabSwitchOnAudioEnd(), 50);
    }
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
    isAudioPlaying,
    currentPlayingId
  });

  formattedMessages.forEach((msg, idx) => {
    console.log(`📝 [RadioMessagesView] Messaggio ${idx}:`, {
      id: msg.id,
      sender_type: msg.sender_type,
      sender_name: msg.sender_name,
      has_audio: !!msg.audio_url,
      audio_url: msg.audio_url?.substring(0, 50)
    });
  });

  return (
    <ScrollArea className="h-full px-4">
      <div className="space-y-4 pb-4 max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto">
        {formattedMessages.map((message, index) => {
          // 🎯 Primo messaggio AI deve SEMPRE poter fare autoplay
          const isFirstAIMessage = message.sender_type !== 'human' && 
            index === formattedMessages.findIndex(m => m.sender_type !== 'human');
          
          const canAutoPlay = isFirstAIMessage || 
            (!isAudioPlaying || currentPlayingId === message.id);
          
          console.log(`🎵 [RadioMessagesView] Messaggio ${message.id}:`, {
            sender: message.sender_name,
            isFirstAI: isFirstAIMessage,
            canAutoPlay: canAutoPlay && isAudioEnabled,
            isAudioEnabled,
            isAudioPlaying,
            currentPlayingId
          });
          
          return (
            <MultiAgentMessage
              key={message.id}
              message={message}
              onAudioEnd={onAudioEndComplete}
              onAudioStateChange={(playing) => 
                playing ? handleAudioStart(message.id) : audioEnd()
              }
              canAutoPlay={canAutoPlay && isAudioEnabled}
            />
          );
        })}
      </div>
    </ScrollArea>
  );
}
