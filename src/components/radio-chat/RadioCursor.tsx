import { cn } from '@/lib/utils';

interface RadioCursorProps {
  isActive: boolean;
  isFocused: boolean;
}

export function RadioCursor({ isActive, isFocused }: RadioCursorProps) {
  if (!isActive) {
    return null;
  }

  // Cursore custom: bianco quando focus, rosso quando no focus
  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-6">
      {/* Cursore */}
      <div className={cn(
        "w-[10px] h-5",
        isFocused ? "bg-white" : "bg-red-500",
        "animate-pulse"
      )} />
      
      {/* Testo sotto cursore */}
      <p className="text-white/70 text-sm md:text-base text-center whitespace-nowrap">
        Hello, what do you want to know today?
      </p>
    </div>
  );
}
