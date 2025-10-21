import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Camera, Loader2, RefreshCw } from 'lucide-react';
import { PromptSection } from './types';
import { PromptCard } from './PromptCard';

interface PromptLibraryColumnProps {
  sections: PromptSection[];
  onGenerateThumbnails: () => Promise<void>;
  onRefresh: () => Promise<void>;
  isGenerating: boolean;
  isRefreshing: boolean;
  generationProgress?: { current: number; total: number; sectionName: string } | null;
}

export function PromptLibraryColumn({ 
  sections, 
  onGenerateThumbnails,
  onRefresh,
  isGenerating,
  isRefreshing,
  generationProgress
}: PromptLibraryColumnProps) {
  const missingThumbnails = sections.filter(s => !s.thumbnail_url).length;

  return (
    <div className="flex-1 border-r bg-background flex flex-col min-h-0">
      <div className="p-4 border-b space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Libreria Prompt</h3>
          <span className="text-xs text-muted-foreground">
            {sections.length} prompt
          </span>
        </div>
        
        <div className="flex gap-2">
          {/* Pulsante Genera Miniature */}
          {missingThumbnails > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={onGenerateThumbnails}
              disabled={isGenerating || isRefreshing}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {generationProgress 
                    ? `${generationProgress.current}/${generationProgress.total}` 
                    : 'Generazione...'}
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4 mr-2" />
                  📸 Genera {missingThumbnails}
                </>
              )}
            </Button>
          )}
          
          {/* Pulsante Refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isGenerating || isRefreshing}
            title="Ricarica sezioni dal database"
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Progress durante generazione */}
        {isGenerating && generationProgress && (
          <div className="text-xs text-muted-foreground">
            📸 Generazione: <span className="font-medium">{generationProgress.sectionName}</span>
          </div>
        )}
      </div>
      
      <ScrollArea className="flex-1 p-4 min-h-0">
        <div className="space-y-3">
          {sections.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Seleziona un gruppo dalla sidebar
            </div>
          ) : (
            sections.map(section => (
              <PromptCard key={section.id} section={section} />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
