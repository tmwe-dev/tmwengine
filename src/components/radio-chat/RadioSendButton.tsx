import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RadioSendButtonProps {
  onSend: () => void;
  disabled?: boolean;
  visible?: boolean;
}

export function RadioSendButton({ onSend, disabled, visible = true }: RadioSendButtonProps) {
  if (!visible) return null;

  return (
    <button
      onClick={(e) => {
        console.log('🖱️ Button clicked!', { disabled, visible });
        if (!disabled) {
          onSend();
        }
      }}
      disabled={disabled}
      className={cn(
        "absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full mt-8",
        "text-white hover:text-white/80 transition-all",
        "hover:scale-110",
        "z-50",
        disabled 
          ? "opacity-30 cursor-not-allowed pointer-events-none" 
          : "cursor-pointer opacity-100"
      )}
    >
      <Send className="w-8 h-8" />
    </button>
  );
}
