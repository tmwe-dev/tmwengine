import { useEffect, useRef, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface RadioMessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClose?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  disabled?: boolean;
  className?: string;
}

export function RadioMessageInput({
  value,
  onChange,
  onSubmit,
  onClose,
  onFocus,
  onBlur,
  disabled = false,
  className
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
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose?.();
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
        "w-full text-lg md:text-xl lg:text-2xl",
        "bg-gradient-to-r from-purple-500/40 via-purple-400/20 to-transparent backdrop-blur-sm border border-purple-400/30 shadow-none",
        "text-white placeholder:text-white/30",
        "focus-visible:ring-0 focus-visible:ring-offset-0",
        "resize-none overflow-y-auto align-top",
        "max-h-[4.5rem] md:max-h-[5rem] lg:max-h-[6rem]",
        "px-4 py-3 rounded-lg",
        isFocused ? 'caret-white' : 'caret-red-500',
        className
      )}
    />
  );
}
