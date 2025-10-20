import { Puzzle, Download, Star, Tag } from "lucide-react";
import { Plugin } from "@/types/design-lab-scanner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface PluginLibraryItemProps {
  plugin: Plugin;
  collapsed: boolean;
}

export function PluginLibraryItem({ plugin, collapsed }: PluginLibraryItemProps) {
  const { toast } = useToast();

  const handleInstall = () => {
    toast({
      title: "Installazione plugin",
      description: `Installazione di ${plugin.plugin_name} in corso...`,
    });
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        type: "plugin",
        plugin: plugin,
      })
    );
    e.dataTransfer.effectAllowed = "copy";
  };

  if (collapsed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              draggable
              onDragStart={handleDragStart}
              className="p-2 hover:bg-accent cursor-move rounded-md"
            >
              <Puzzle className="h-4 w-4" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="font-medium">{plugin.plugin_name}</p>
            <p className="text-xs text-muted-foreground">v{plugin.version}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="group p-3 border rounded-lg hover:border-primary transition-all cursor-move bg-card"
    >
      <div className="flex items-start gap-3">
        <Puzzle className="h-5 w-5 text-purple-500 mt-1 flex-shrink-0" />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate">{plugin.plugin_name}</h4>
              <p className="text-xs text-muted-foreground">{plugin.plugin_type}</p>
            </div>
            
            <div className="flex items-center gap-1 flex-shrink-0">
              {plugin.rating && (
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs">{plugin.rating}</span>
                </div>
              )}
            </div>
          </div>

          {plugin.thumbnail_url && (
            <div className="mt-2 rounded overflow-hidden border bg-muted">
              <img
                src={plugin.thumbnail_url}
                alt={plugin.plugin_name}
                className="w-full h-20 object-cover"
              />
            </div>
          )}

          {plugin.description && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
              {plugin.description}
            </p>
          )}

          <div className="mt-2 flex items-center gap-1 flex-wrap">
            {plugin.tags?.slice(0, 3).map((tag, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                <Tag className="h-2 w-2 mr-1" />
                {tag}
              </Badge>
            ))}
          </div>

          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>v{plugin.version}</span>
            <div className="flex items-center gap-2">
              <span>Usi: {plugin.usage_count}</span>
              {plugin.is_exported && (
                <Badge variant="outline" className="h-5">Esportato</Badge>
              )}
            </div>
          </div>

          <div className="mt-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-7 opacity-0 group-hover:opacity-100"
                    onClick={handleInstall}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Installa
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Installa plugin nel progetto</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {plugin.components_included && plugin.components_included.length > 0 && (
            <div className="mt-2 text-xs text-muted-foreground">
              Componenti: {plugin.components_included.length} | 
              Funzioni: {plugin.functions_included?.length || 0}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
