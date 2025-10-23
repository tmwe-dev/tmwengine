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
  disabled
}: RadioMessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Auto-focus on mount
    if (textareaRef.current && !disabled) {
      textareaRef.current.focus();
    }
  }, [disabled]);

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
        "w-full min-h-[120px] text-center text-2xl md:text-3xl",
        "bg-transparent border-none shadow-none",
        "text-white placeholder:text-transparent",
        "focus-visible:ring-0 focus-visible:ring-offset-0",
        "resize-none"
      )}
    />
  );
}
