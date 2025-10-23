import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface RadioCursorProps {
  isActive: boolean;
  isFocused?: boolean;
  conversationId?: string | null;
}

export function RadioCursor({ isActive, isFocused }: RadioCursorProps) {
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setBlink(prev => !prev);
    }, 530);

    return () => clearInterval(interval);
  }, []);

  // Determina il colore in base allo stato
  const cursorColor = isActive ? 'bg-white' : 'bg-red-500';
  const cursorBorderColor = isActive ? 'border-white' : 'border-red-500';

  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
      <div 
        className={cn(
          "w-6 h-12 transition-all duration-300 border-2",
          cursorColor,
          cursorBorderColor,
          blink ? 'opacity-100' : 'opacity-0'
        )}
        style={{
          clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
        }}
      />
      
      {/* Testo di stato sotto il cursore */}
      <div className={cn(
        "absolute top-full mt-4 left-1/2 -translate-x-1/2",
        "text-xs font-medium whitespace-nowrap",
        isActive ? 'text-white/60' : 'text-red-400/80'
      )}>
        {isActive ? 'Pronto per scrivere' : 'In attesa...'}
      </div>
    </div>
  );
}
