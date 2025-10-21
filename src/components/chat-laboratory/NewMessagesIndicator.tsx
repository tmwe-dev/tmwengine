import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface NewMessagesIndicatorProps {
  showIndicator: boolean;
  newMessagesCount: number;
  onScrollToBottom: () => void;
}

export const NewMessagesIndicator = ({
  showIndicator,
  newMessagesCount,
  onScrollToBottom
}: NewMessagesIndicatorProps) => {
  if (!showIndicator) return null;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 animate-fade-in">
      <Button
        onClick={onScrollToBottom}
        variant="secondary"
        size="sm"
        className="shadow-lg border border-border/40 gap-2 bg-card/95 backdrop-blur hover:bg-card"
      >
        <Badge variant="default" className="rounded-full px-1.5 py-0.5 min-w-[20px] text-xs">
          {newMessagesCount}
        </Badge>
        <span className="text-sm">Nuovi messaggi</span>
        <span className="text-lg">↓</span>
      </Button>
    </div>
  );
};
