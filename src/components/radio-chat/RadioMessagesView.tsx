import { MultiAgentMessage } from '@/components/chat-laboratory/MultiAgentMessage';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioMessage } from '@/types/radio';

interface RadioMessagesViewProps {
  messages: RadioMessage[];
}

export function RadioMessagesView({ messages }: RadioMessagesViewProps) {
  // Convert RadioMessage to expected format for MultiAgentMessage
  const formattedMessages = messages.map(msg => ({
    ...msg,
    conversation_id: msg.conversation_id || '',
    is_visible_to_ai: msg.is_visible_to_ai ?? true,
    sender_type: msg.sender_type as 'human' | 'chatgpt' | 'gemini' | 'claude'
  }));

  return (
    <ScrollArea className="h-[calc(100vh-56px-70px-200px)] px-4">
      <div className="space-y-4 pb-4">
        {formattedMessages.map((message) => (
          <MultiAgentMessage
            key={message.id}
            message={message}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
