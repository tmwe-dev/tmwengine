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
      onClick={onSend}
      disabled={disabled}
      className={cn(
        "absolute left-1/2 -translate-x-1/2 -bottom-20",
        "text-white hover:text-white/80 transition-all",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "hover:scale-110"
      )}
    >
      <Send className="w-8 h-8" />
    </button>
  );
}
