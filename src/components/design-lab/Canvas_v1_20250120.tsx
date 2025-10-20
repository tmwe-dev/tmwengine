import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CanvasElement } from "./CanvasElement";
import { SnapGuideLines } from "./SnapGuideLines";
import { DistanceLabels } from "./DistanceLabels";
import { DesignLabComponent } from "@/types/design-lab";
import { GuideLine, DistanceInfo } from "@/lib/design-lab/snap-guides";

interface CanvasProps {
  components: DesignLabComponent[];
  selectedComponentId: string | null;
  onSelectComponent: (id: string | null) => void;
  onDropComponent: (componentData: any, position: { x: number; y: number }) => void;
  onUpdatePosition: (id: string, position: any) => void;
  className?: string;
}

export const Canvas = ({
  components,
  selectedComponentId,
  onSelectComponent,
  onDropComponent,
  onUpdatePosition,
  className,
}: CanvasProps) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [activeGuides, setActiveGuides] = useState<GuideLine[]>([]);
  const [activeDistances, setActiveDistances] = useState<DistanceInfo[]>([]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    try {
      const componentData = JSON.parse(e.dataTransfer.getData('application/json'));
      onDropComponent(componentData, { x, y });
    } catch (error) {
      console.error('Error parsing dropped component:', error);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    // Deselect if clicking on empty canvas area
    if (e.target === e.currentTarget) {
      onSelectComponent(null);
    }
  };

  return (
    <Card
      ref={canvasRef}
      className={cn(
        "relative bg-background overflow-auto transition-colors",
        isDraggingOver && "bg-accent/50 border-primary",
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleCanvasClick}
      style={{ minHeight: '800px' }}
    >
      {/* Grid background */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
        }}
      />

      {/* Snap Guide Lines */}
      <SnapGuideLines guides={activeGuides} />

      {/* Distance Labels */}
      <DistanceLabels distances={activeDistances} />

      {/* Components */}
      {components.map((component) => (
        <CanvasElement
          key={component.id}
          component={component}
          isSelected={component.id === selectedComponentId}
          onSelect={() => onSelectComponent(component.id)}
          onUpdatePosition={(position) => onUpdatePosition(component.id, position)}
          canvasRef={canvasRef}
          components={components}
          onGuidesChange={setActiveGuides}
          onDistancesChange={setActiveDistances}
        />
      ))}

      {/* Empty state */}
      {components.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-medium">Canvas Vuoto</p>
            <p className="text-sm mt-2">
              Trascina componenti dalla palette a sinistra per iniziare
            </p>
          </div>
        </div>
      )}
    </Card>
  );
};
