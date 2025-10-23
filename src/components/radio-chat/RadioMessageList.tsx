import { useEffect, useRef } from 'react';
import { RadioMessage } from './RadioMessage';
import { Loader2 } from 'lucide-react';

interface RadioMessageListProps {
  messages: any[];
  isLoading?: boolean;
}

export function RadioMessageList({ messages, isLoading }: RadioMessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div 
      ref={containerRef}
      className="w-full max-w-4xl mb-12 max-h-[50vh] overflow-y-auto px-4"
    >
      {messages.map((message) => (
        <RadioMessage key={message.id} message={message} />
      ))}
      
      {isLoading && (
        <div className="flex items-center justify-center mt-6">
          <Loader2 className="w-6 h-6 text-white/60 animate-spin" />
          <span className="ml-2 text-white/60">AI sta pensando...</span>
        </div>
      )}
    </div>
  );
}
