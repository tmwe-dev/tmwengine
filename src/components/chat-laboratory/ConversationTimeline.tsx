import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { User, Bot } from 'lucide-react';

interface TimelineMessage {
  created_at: string;
  sender_type: string;
  sender_name: string;
  content: string;
}

interface ConversationTimelineProps {
  messages: TimelineMessage[];
}

export const ConversationTimeline = ({ messages }: ConversationTimelineProps) => {
  const getParticipantIcon = (type: string) => {
    switch (type) {
      case 'human': return <User className="h-3 w-3" />;
      case 'chatgpt': return '🤖';
      case 'gemini': return '🔷';
      case 'claude': return '🧠';
      default: return <Bot className="h-3 w-3" />;
    }
  };

  const getParticipantColor = (type: string) => {
    switch (type) {
      case 'human': return 'bg-primary/20 text-primary';
      case 'chatgpt': return 'bg-green-500/20 text-green-700 dark:text-green-400';
      case 'gemini': return 'bg-blue-500/20 text-blue-700 dark:text-blue-400';
      case 'claude': return 'bg-purple-500/20 text-purple-700 dark:text-purple-400';
      default: return 'bg-muted';
    }
  };

  return (
    <ScrollArea className="h-[300px] w-full border rounded-lg p-4">
      <div className="space-y-3">
        {messages.map((msg, index) => {
          const time = new Date(msg.created_at).toLocaleTimeString('it-IT', {
            hour: '2-digit',
            minute: '2-digit'
          });

          return (
            <div key={index} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <Badge 
                  variant="outline" 
                  className={`${getParticipantColor(msg.sender_type)} px-2 py-1 text-xs`}
                >
                  {typeof getParticipantIcon(msg.sender_type) === 'string' ? (
                    <span>{getParticipantIcon(msg.sender_type)}</span>
                  ) : (
                    getParticipantIcon(msg.sender_type)
                  )}
                </Badge>
                {index < messages.length - 1 && (
                  <div className="w-px h-8 bg-border mt-1" />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{msg.sender_name}</span>
                  <span className="text-xs text-muted-foreground">{time}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {msg.content}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
};
