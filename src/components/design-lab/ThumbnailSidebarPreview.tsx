import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

interface ThumbnailPreview {
  componentId: string;
  componentName: string;
  thumbnailUrl: string;
  timestamp: number;
}

interface Props {
  thumbnails: ThumbnailPreview[];
  currentProgress: number;
  totalComponents: number;
}

export function ThumbnailSidebarPreview({ thumbnails, currentProgress, totalComponents }: Props) {
  return (
    <Card className="w-80 h-full p-4 bg-card border-border">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          Miniature Generate
        </h3>
        <p className="text-sm text-muted-foreground">
          {currentProgress} / {totalComponents}
        </p>
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="space-y-3">
          {thumbnails.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Le miniature appariranno qui durante la generazione...
            </p>
          ) : (
            thumbnails.map((thumb) => (
              <Card 
                key={thumb.componentId} 
                className="p-3 bg-background/50 border-border animate-in fade-in slide-in-from-left-5 duration-300"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <img
                      src={thumb.thumbnailUrl}
                      alt={thumb.componentName}
                      className="w-16 h-16 object-cover rounded border border-border"
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {thumb.componentName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(thumb.timestamp).toLocaleTimeString('it-IT')}
                    </p>
                  </div>

                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}
