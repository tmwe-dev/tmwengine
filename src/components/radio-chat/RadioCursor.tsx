import { cn } from '@/lib/utils';

interface RadioCursorProps {
  isActive: boolean;
}

export function RadioCursor({ isActive }: RadioCursorProps) {
  if (isActive) {
    // Cursore quadrato lampeggiante quando attivo
    return (
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className={cn(
          "w-0.5 h-5 bg-white",
          "animate-pulse"
        )} />
      </div>
    );
  }

  // Lineetta che si muove left-right quando inattivo (configurazione sidebar)
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
