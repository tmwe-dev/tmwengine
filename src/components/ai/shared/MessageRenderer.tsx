/**
 * MessageRenderer - Rendering messaggi con typing effect e audio player
 * Estratto da ChatLaboratory per riutilizzo in AISidebarSliderUnified
 */

import { User, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { Badge } from '@/components/ui/badge';

interface Message {
  id: string;
  sender_type: 'human' | 'chatgpt' | 'gemini' | 'claude';
  sender_name: string;
  content: string;
  audio_url?: string | null;
  created_at?: string;
}

interface MessageRendererProps {
  message: Message;
  showAvatar?: boolean;
  compact?: boolean;
}

export const MessageRenderer = ({ message, showAvatar = true, compact = false }: MessageRendererProps) => {
  const isUser = message.sender_type === 'human';

  return (
    <div className={cn(
      "flex gap-3 p-3 rounded-lg animate-in fade-in slide-in-from-bottom-2",
      isUser ? "bg-primary/5" : "bg-muted/50"
    )}>
      {showAvatar && (
        <div className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
        )}>
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </div>
      )}

      <div className="flex-1 space-y-2">
        {/* Header */}
        {!compact && (
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{message.sender_name}</span>
            <Badge variant="outline" className="text-xs">
              {message.sender_type}
            </Badge>
          </div>
        )}

        {/* Content */}
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>

        {/* Audio Player */}
        {message.audio_url && (
          <audio controls className="w-full mt-2">
            <source src={message.audio_url} type="audio/mpeg" />
          </audio>
        )}

        {/* Timestamp */}
        {!compact && message.created_at && (
          <span className="text-xs text-muted-foreground">
            {new Date(message.created_at).toLocaleTimeString('it-IT', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        )}
      </div>
    </div>
  );
};
