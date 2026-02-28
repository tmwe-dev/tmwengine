import { useEffect, useRef } from 'react';
import { MultiAgentMessage } from '@/components/chat-laboratory/MultiAgentMessage';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioMessage } from '@/types/radio';
import { cn } from '@/lib/utils';

interface RadioMessagesViewProps {
  messages: RadioMessage[];
  isAutoAdvanceEnabled?: boolean;
  isAudioEnabled?: boolean;
  /** ID del messaggio attualmente in riproduzione audio (dal parent) */
  currentPlayingId?: string;
  /** Stato audio globale dal parent */
  isAudioPlaying?: boolean;
  /** Callback quando l'audio inizia (verso il parent) */
  onAudioStart?: (messageId: string) => void;
  /** Callback quando l'audio finisce (verso il parent) */
  onAudioEnd?: () => void;
}

export function RadioMessagesView({ 
  messages,
  isAutoAdvanceEnabled = true,
  isAudioEnabled = true,
  currentPlayingId = '',
  isAudioPlaying = false,
  onAudioStart,
  onAudioEnd
}: RadioMessagesViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(0);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > lastMessageCountRef.current) {
      lastMessageCountRef.current = messages.length;
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages.length]);

  // Convert RadioMessage to expected format for MultiAgentMessage
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
          const isCurrentlyPlaying = message.id === currentPlayingId;
          
          return (
            <div 
              key={message.id}
              className={cn(
                "transition-all duration-300",
                isCurrentlyPlaying 
                  ? "ring-2 ring-primary/50 rounded-lg" 
                  : "opacity-80 hover:opacity-100"
              )}
            >
              <MultiAgentMessage
                message={message}
                canAutoPlay={false}
                isAudioPlayingGlobally={isAudioPlaying}
                onAudioEnd={() => onAudioEnd?.()}
                onAudioStateChange={(playing) => {
                  if (playing) {
                    onAudioStart?.(message.id);
                  } else {
                    onAudioEnd?.();
                  }
                }}
                orchestratorFunction="radio-chat-orchestrator"
              />
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>
    </ScrollArea>
  );
}
