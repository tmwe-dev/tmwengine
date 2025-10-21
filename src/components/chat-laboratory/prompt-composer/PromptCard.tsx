import { useDraggable, DraggableAttributes } from '@dnd-kit/core';
import { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { GripVertical, ImageOff, Loader2, Maximize2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PromptSection } from './types';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface PromptCardProps {
  section: PromptSection;
  isDragging?: boolean;
  onDuplicate?: (section: PromptSection) => Promise<void>;
}

export function PromptCard({ section, isDragging, onDuplicate }: PromptCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [fullPreviewOpen, setFullPreviewOpen] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

  const draggable = useDraggable({
    id: section.id,
    data: section,
  });
  
  const attributes: DraggableAttributes = draggable.attributes;
  const listeners: SyntheticListenerMap | undefined = draggable.listeners;
  const setNodeRef = draggable.setNodeRef;
  const transform = draggable.transform;

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  // Preview: prime 100 caratteri
  const preview = section.content.substring(0, 100) + (section.content.length > 100 ? '...' : '');

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDuplicate || isDuplicating) return;
    
    setIsDuplicating(true);
    try {
      await onDuplicate(section);
    } finally {
      setIsDuplicating(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "transition-opacity",
        isDragging && "opacity-50"
      )}
    >
      <Card className="hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing">
        <CardHeader className="p-3">
          <div className="flex items-start gap-2">
            <div {...listeners} {...attributes} className="cursor-grab mt-1">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm line-clamp-1">{section.section_name}</CardTitle>
              <Badge variant="outline" className="text-xs mt-1">
                {section.section_type}
              </Badge>
            </div>
            {/* Pulsante Duplicate */}
            {onDuplicate && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={handleDuplicate}
                disabled={isDuplicating}
                title="Duplica questo prompt"
              >
                {isDuplicating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          {/* Thumbnail con spinner loading - INGRANDITA E RESPONSIVE */}
          <div 
            className="w-full h-48 md:h-56 lg:h-64 xl:h-72 bg-muted rounded mb-2 flex items-center justify-center overflow-hidden relative group cursor-pointer"
            onClick={() => section.thumbnail_url && setFullPreviewOpen(true)}
          >
            {section.thumbnail_url ? (
              <>
                {!imageLoaded && !imageError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
                  </div>
                )}
                <img 
                  src={section.thumbnail_url} 
                  alt={section.section_name}
                  className={cn(
                    "w-full h-full object-cover transition-all duration-200",
                    imageLoaded ? "opacity-100" : "opacity-0",
                    "group-hover:scale-105 group-hover:ring-2 group-hover:ring-primary"
                  )}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => {
                    setImageError(true);
                    console.error(`Failed to load thumbnail: ${section.thumbnail_url}`);
                  }}
                />
                {imageError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <ImageOff className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                )}
                {/* Overlay ingrandimento su hover */}
                {imageLoaded && !imageError && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <Maximize2 className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground/50">
                <ImageOff className="h-6 w-6" />
                <span className="text-xs">No thumbnail</span>
              </div>
            )}
          </div>
          {/* Preview testo */}
          <p className="text-xs text-muted-foreground line-clamp-2">
            {preview}
          </p>
        </CardContent>
      </Card>

      {/* Modal full-screen per preview completa */}
      <Dialog open={fullPreviewOpen} onOpenChange={setFullPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Badge variant="outline">{section.section_type}</Badge>
              {section.section_name}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 max-h-[calc(90vh-120px)]">
            <div className="space-y-4 pr-4">
              {/* Immagine full size scrollabile */}
              {section.thumbnail_url && !imageError && (
                <>
                  <img
                    src={section.thumbnail_url}
                    alt={section.section_name}
                    className="w-full h-auto rounded-lg border"
                    onError={() => setImageError(true)}
                  />
                  <Separator />
                </>
              )}
              {/* Testo completo */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground">Contenuto Completo</h4>
                <pre className="text-sm whitespace-pre-wrap font-mono bg-muted p-4 rounded-lg">
                  {section.content}
                </pre>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
