import { cn } from '@/lib/utils';
import { RadioMessage } from '@/types/radio';
import ReactMarkdown from 'react-markdown';

const SENDER_COLORS: Record<string, string> = {
  human: 'text-blue-400',
  chatgpt: 'text-green-400',
  gemini: 'text-cyan-400',
  claude: 'text-purple-400',
};

interface RadioMessageViewProps {
  message: RadioMessage;
  onAudioEnd?: () => void;
  onAudioStart?: (messageId: string) => void;
  isAudioEnabled?: boolean;
  canAutoPlay?: boolean;
  showAudioPlayer?: boolean;
}

export const RadioMessageView = ({ message }: RadioMessageViewProps) => {
  const senderColor = SENDER_COLORS[message.sender_type] || 'text-muted-foreground';

  return (
    <div className="p-4 md:p-6 max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto">
      <div className={cn('text-sm font-medium mb-2', senderColor)}>
        {message.sender_name}
      </div>
      <div className="text-foreground/90 text-base md:text-lg prose prose-invert prose-sm max-w-none">
        <ReactMarkdown>{message.content}</ReactMarkdown>
      </div>
    </div>
  );
};
