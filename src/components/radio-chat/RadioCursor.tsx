import { cn } from '@/lib/utils';

interface RadioCursorProps {
  isActive: boolean;
}

export function RadioCursor({ isActive }: RadioCursorProps) {
  if (isActive) {
    // Linea animata left-right quando inattivo (no focus, campo vuoto)
    return (
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full">
        <div className={cn(
          "relative w-[60%] h-[1px] mx-auto",
          "after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1px] after:origin-left",
          "after:bg-gradient-to-r after:from-white/65 after:via-black after:via-40% after:to-transparent",
          "after:animate-line-bounce"
        )} />
      </div>
    );
  }

  // Cursore quadrato lampeggiante quando focus o scrittura
  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
      <div className={cn(
        "w-1 h-8 bg-white",
        "animate-cursor-blink",
        "rounded-sm"
      )} />
    </div>
  );
}
