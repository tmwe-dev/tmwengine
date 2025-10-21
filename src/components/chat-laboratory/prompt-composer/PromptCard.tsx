import { useDraggable, DraggableAttributes } from '@dnd-kit/core';
import { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GripVertical, ImageOff, Loader2 } from 'lucide-react';
import { PromptSection } from './types';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface PromptCardProps {
  section: PromptSection;
  isDragging?: boolean;
}

export function PromptCard({ section, isDragging }: PromptCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

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
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          {/* Thumbnail con spinner loading */}
          <div className="w-full h-32 bg-muted rounded mb-2 flex items-center justify-center overflow-hidden relative">
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
                    "w-full h-full object-cover transition-opacity",
                    imageLoaded ? "opacity-100" : "opacity-0"
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
    </div>
  );
}
