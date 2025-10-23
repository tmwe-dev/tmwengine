import { cn } from '@/lib/utils';

interface RadioMessageProps {
  message: {
    sender_type: string;
    sender_name: string;
    content: string;
    created_at: string;
  };
}

export function RadioMessage({ message }: RadioMessageProps) {
  const isHuman = message.sender_type === 'human';
  
  return (
    <div className={cn(
      "animate-in fade-in slide-in-from-bottom-2 duration-500",
      "mb-6 text-lg md:text-xl max-w-3xl mx-auto"
    )}>
      <div className={cn(
        "font-medium mb-1",
        isHuman ? "text-blue-400" : "text-green-400"
      )}>
        {message.sender_name}
      </div>
      <div className="text-white/90 whitespace-pre-wrap">
        {message.content}
      </div>
    </div>
  );
}
