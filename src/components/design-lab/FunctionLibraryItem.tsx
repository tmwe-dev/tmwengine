import { Code2, Copy, Zap } from "lucide-react";
import { ExtractedFunction } from "@/types/design-lab-scanner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface FunctionLibraryItemProps {
  functionItem: ExtractedFunction;
  collapsed: boolean;
}

export function FunctionLibraryItem({ functionItem, collapsed }: FunctionLibraryItemProps) {
  const { toast } = useToast();

  const handleCopyCode = () => {
    navigator.clipboard.writeText(functionItem.code_generic);
    toast({
      title: "Codice copiato",
      description: `Codice di ${functionItem.function_name} copiato negli appunti`,
    });
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        type: "extracted-function",
        function: functionItem,
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
              <Code2 className="h-4 w-4" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="font-medium">{functionItem.function_name}</p>
            <p className="text-xs text-muted-foreground">{functionItem.function_type}</p>
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
        <Code2 className="h-5 w-5 text-blue-500 mt-1 flex-shrink-0" />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate">{functionItem.function_name}</h4>
              <p className="text-xs text-muted-foreground">{functionItem.function_type}</p>
            </div>
            
            {functionItem.is_async && (
              <Badge variant="outline" className="flex-shrink-0 h-5">
                <Zap className="h-3 w-3 mr-1" />
                Async
              </Badge>
            )}
          </div>

          {functionItem.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {functionItem.description}
            </p>
          )}

          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {functionItem.event_handlers?.map((handler, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {handler}
              </Badge>
            ))}
          </div>

          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {functionItem.complexity_score && (
                <span>
                  Complessità: {functionItem.complexity_score}/10
                </span>
              )}
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100"
                    onClick={handleCopyCode}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copia codice generico</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {functionItem.dependencies && functionItem.dependencies.length > 0 && (
            <div className="mt-2 text-xs text-muted-foreground">
              Dipendenze: {functionItem.dependencies.length}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
