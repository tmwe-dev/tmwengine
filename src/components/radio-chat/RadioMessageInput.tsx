import { useEffect, useRef, useState } from 'react';
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
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      setIsFocused(true);
    }
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [value]);

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
      onFocus={() => {
        setIsFocused(true);
        onFocus?.();
      }}
      onBlur={() => {
        setIsFocused(false);
        onBlur?.();
      }}
      disabled={disabled}
      placeholder=""
      className={cn(
        "w-full h-[75vh] text-lg md:text-xl",
        "bg-transparent border-none shadow-none",
        "text-white placeholder:text-white/30",
        "focus-visible:ring-0 focus-visible:ring-offset-0",
        "resize-none overflow-y-auto align-top",
        isFocused ? 'caret-white' : 'caret-red-500'
      )}
    />
  );
}
