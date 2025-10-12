import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';

interface MessageNavigationBarProps {
  currentIndex: number;
  totalMessages: number;
  onPrevious: () => void;
  onNext: () => void;
  canEnableFullScreen: boolean;
  isFullScreenMode: boolean;
  onToggleFullScreen: () => void;
}

export const MessageNavigationBar = ({
  currentIndex,
  totalMessages,
  onPrevious,
  onNext,
  canEnableFullScreen,
  isFullScreenMode,
  onToggleFullScreen
}: MessageNavigationBarProps) => {
  // Se viene usato solo per il maximize button, mostra solo quello
  if (totalMessages === 0) {
    return (
      <Button
        variant="outline"
        size="icon"
        onClick={onToggleFullScreen}
        className="h-8 w-8"
        title={isFullScreenMode ? "Esci da schermo intero" : "Modalità schermo intero"}
      >
        {isFullScreenMode ? (
          <Minimize2 className="h-4 w-4" />
        ) : (
          <Maximize2 className="h-4 w-4" />
        )}
      </Button>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 mb-3">
      <Button
        variant="outline"
        size="sm"
        onClick={onPrevious}
        disabled={currentIndex === 0}
        className="h-8"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Precedente
      </Button>

      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="px-3 py-1">
          Messaggio {currentIndex + 1} di {totalMessages}
        </Badge>

        {canEnableFullScreen && (
          <Button
            variant="outline"
            size="icon"
            onClick={onToggleFullScreen}
            className="h-8 w-8"
            title={isFullScreenMode ? "Esci da schermo intero" : "Modalità schermo intero"}
          >
            {isFullScreenMode ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={onNext}
        disabled={currentIndex === totalMessages - 1}
        className="h-8"
      >
        Successivo
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
};
