import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Camera, Loader2, RefreshCw } from 'lucide-react';
import { PromptSection } from './types';
import { PromptCard } from './PromptCard';
import { cn } from '@/lib/utils';

interface PromptLibraryColumnProps {
  sections: PromptSection[];
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
  className?: string;
}

export function PromptLibraryColumn({ 
  sections, 
  onRefresh,
  isRefreshing,
  className
}: PromptLibraryColumnProps) {

  return (
    <div className={cn("flex flex-col h-full border-r bg-background", className)}>
      <div className="p-4 border-b space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Libreria Prompt</h3>
          <span className="text-xs text-muted-foreground">
            {sections.length} prompt
          </span>
        </div>
        
        {/* Pulsante Refresh */}
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Ricarica sezioni dal database"
          className="w-full"
        >
          {isRefreshing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Caricamento...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Ricarica Libreria
            </>
          )}
        </Button>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {sections.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Seleziona un gruppo dalla sidebar
            </div>
          ) : (
            sections.map(section => (
              <PromptCard key={section.id} section={section} onEdit={onRefresh} />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
