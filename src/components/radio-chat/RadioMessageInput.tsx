import { useEffect, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface RadioMessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  disabled?: boolean;
}

export function RadioMessageInput({
  value,
  onChange,
  onSubmit,
  onFocus,
  onBlur,
  disabled = false
}: RadioMessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) {
        onSubmit();
      }
    }
  };

  return (
    <Textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
      disabled={disabled}
      placeholder=""
      className={cn(
        "w-full min-h-[200px] max-h-[50vh] text-base md:text-lg",
        "text-center",
        "bg-transparent border-none shadow-none",
        "text-white placeholder:text-white/30",
        "focus-visible:ring-0 focus-visible:ring-offset-0",
        "resize-none overflow-y-auto",
        "caret-white"
      )}
    />
  );
}
