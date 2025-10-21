import { useState } from 'react';
import { GripVertical, Copy, Eye, ImageOff } from "lucide-react";
import { ExtractedComponent } from "@/types/design-lab-scanner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { ComponentPreviewDialog } from './ComponentPreviewDialog';

interface ComponentLibraryItemProps {
  component: ExtractedComponent;
  collapsed: boolean;
}

export function ComponentLibraryItem({ component, collapsed }: ComponentLibraryItemProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const { toast } = useToast();

  const handleDragStart = (e: React.DragEvent) => {
    // Store component data in drag event
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'design-lab-component',
      component: component,
    }));
    
    // Create custom drag image if thumbnail exists
    if (component.thumbnail_url) {
      const img = new Image();
      img.src = component.thumbnail_url;
      e.dataTransfer.setDragImage(img, 0, 0);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(component.jsx_code);
    toast({
      title: "Codice copiato",
      description: `Codice di ${component.component_name} copiato negli appunti`,
    });
  };

  const handlePreview = () => {
    setPreviewOpen(true);
  };

  if (collapsed) {
    return (
      <>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                draggable
                onDragStart={handleDragStart}
                className="p-2 hover:bg-accent cursor-move rounded-md"
              >
                <GripVertical className="h-4 w-4" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p className="font-medium">{component.component_name}</p>
              <p className="text-xs text-muted-foreground">{component.component_type}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <ComponentPreviewDialog
          component={component}
          open={previewOpen}
          onOpenChange={setPreviewOpen}
        />
      </>
    );
  }

  return (
    <>
      <div
        draggable
        onDragStart={handleDragStart}
        className="group p-3 border rounded-lg hover:border-primary transition-all cursor-move bg-card"
      >
        <div className="flex items-start gap-3">
          <GripVertical className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{component.component_name}</h4>
                <p className="text-xs text-muted-foreground">{component.component_type}</p>
              </div>
              
              {component.is_reusable && (
                <span className="px-2 py-0.5 text-xs bg-green-500/10 text-green-500 rounded-full flex-shrink-0">
                  Riusabile
                </span>
              )}
            </div>

            {/* Thumbnail or Placeholder */}
            <div className="mt-2 rounded overflow-hidden border bg-muted">
              {component.thumbnail_url ? (
                <img
                  src={component.thumbnail_url}
                  alt={component.component_name}
                  className="w-full h-24 object-cover"
                />
              ) : (
                <div className="w-full h-24 flex items-center justify-center bg-muted/50">
                  <ImageOff className="h-8 w-8 text-muted-foreground/50" />
                </div>
              )}
            </div>

            {/* Badges for metadata */}
            <div className="mt-2 flex flex-wrap gap-1">
              {component.ui_category && (
                <Badge variant="outline" className="text-xs">
                  {component.ui_category}
                </Badge>
              )}
              {component.complexity_level && (
                <Badge 
                  variant="outline" 
                  className={`text-xs ${
                    component.complexity_level === 'low' ? 'border-green-500/50 text-green-500' :
                    component.complexity_level === 'medium' ? 'border-yellow-500/50 text-yellow-500' :
                    'border-red-500/50 text-red-500'
                  }`}
                >
                  {component.complexity_level}
                </Badge>
              )}
              {component.tags && component.tags.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  +{component.tags.length} tag
                </Badge>
              )}
            </div>

            <div className="mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={handleCopyCode}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copia codice</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={handlePreview}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Anteprima</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {component.dependencies && component.dependencies.length > 0 && (
              <div className="mt-2 text-xs text-muted-foreground">
                Dipendenze: {component.dependencies.length}
              </div>
            )}
          </div>
        </div>
      </div>

      <ComponentPreviewDialog
        component={component}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </>
  );
}
