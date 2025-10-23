import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RadioMessageIconsProps {
  messages: any[];
  onIconClick?: (messageId: string) => void;
}

export function RadioMessageIcons({ messages, onIconClick }: RadioMessageIconsProps) {
  // Filter human messages
  console.log('📊 Total messages:', messages.length);
  const humanMessages = messages.filter(msg => {
    console.log('🔍 Message:', msg);
    return msg.sender_type === 'human';
  });
  console.log('👤 Human messages:', humanMessages.length);
  
  if (humanMessages.length === 0) return null;

  return (
    <div className="fixed right-6 top-[33%] flex flex-col gap-4 z-30">
      {/* Human message icon */}
      <button
        onClick={() => onIconClick?.(humanMessages[0].id)}
        className={cn(
          "w-12 h-12 rounded-full",
          "bg-blue-500/20 hover:bg-blue-500/30",
          "flex items-center justify-center",
          "transition-all duration-200",
          "border-2 border-blue-400"
        )}
        title="Your message"
      >
        <User className="w-6 h-6 text-blue-400" />
      </button>

      {/* AI agent miniatures will appear below */}
      {messages
        .filter(msg => msg.sender_type === 'ai')
        .map((msg, index) => (
          <button
            key={msg.id}
            onClick={() => onIconClick?.(msg.id)}
            className={cn(
              "w-12 h-12 rounded-full",
              "bg-green-500/20 hover:bg-green-500/30",
              "flex items-center justify-center",
              "transition-all duration-200",
              "border-2 border-green-400",
              "text-green-400 text-xs font-bold"
            )}
            title={msg.sender_name}
          >
            AI{index + 1}
          </button>
        ))}
    </div>
  );
}
