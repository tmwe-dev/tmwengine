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
  const formattedMessages = messages.map(msg => ({
    ...msg,
    conversation_id: msg.conversation_id || '',
    is_visible_to_ai: msg.is_visible_to_ai ?? true,
    sender_type: msg.sender_type as 'human' | 'chatgpt' | 'gemini' | 'claude'
  }));

  return (
    <ScrollArea className="h-full px-4">
      <div className="space-y-4 pb-4 max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto">
        {formattedMessages.map((message) => {
          const canAutoPlay = !isAudioPlaying || currentPlayingId === message.id;
          
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
