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
          "w-3 h-6 bg-white",
          "animate-pulse"
        )} />
      </div>
    );
  }

  // Lineetta che si muove left-right quando inattivo
  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
      <div className={cn(
        "w-8 h-0.5 bg-white",
        "animate-[slide_2s_ease-in-out_infinite]"
      )} />
      <style>{`
        @keyframes slide {
          0%, 100% { transform: translateX(-20px); }
          50% { transform: translateX(20px); }
        }
      `}</style>
    </div>
  );
}
