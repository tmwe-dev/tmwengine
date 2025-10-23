import { cn } from '@/lib/utils';

interface RadioCursorProps {
  isActive: boolean;
}

export function RadioCursor({ isActive }: RadioCursorProps) {
  if (isActive) {
    return null;
  }

  // Cursore quadrato lampeggiante quando focus o scrittura
  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
      <div className={cn(
        "w-0.5 h-5 bg-white",
        "animate-pulse"
      )} />
    </div>
  );
}
