import { memo, useState, useRef, useEffect, RefObject } from "react";
import { cn } from "@/lib/utils";
import { DesignLabComponent } from "@/types/design-lab";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { GripVertical } from "lucide-react";
import { GuideLine, getGuideLines, snapToGuides } from "@/lib/design-lab/snap-guides";

interface CanvasElementProps {
  component: DesignLabComponent;
  isSelected: boolean;
  onSelect: () => void;
  onUpdatePosition: (position: any) => void;
  canvasRef: RefObject<HTMLDivElement>;
  components: DesignLabComponent[];
  onGuidesChange: (guides: GuideLine[]) => void;
}

const ComponentRenderer = ({ type, props }: { type: string; props: any }) => {
  switch (type) {
    case 'input':
      return <Input {...props} />;
    case 'button':
      return <Button {...props}>{props.children || 'Button'}</Button>;
    case 'checkbox':
      return (
        <div className="flex items-center space-x-2">
          <Checkbox {...props} />
          <label className="text-sm">{props.label || 'Checkbox'}</label>
        </div>
      );
    case 'textarea':
      return <Textarea {...props} />;
    default:
      return <div className="p-2 border rounded">Unknown: {type}</div>;
  }
};

export const CanvasElement = memo(
  ({ 
    component, 
    isSelected, 
    onSelect, 
    onUpdatePosition, 
    canvasRef, 
    components,
    onGuidesChange 
  }: CanvasElementProps) => {
    const elementRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const position = component.position as { x: number; y: number; width: number; height: number };

    const handleMouseDown = (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('.resize-handle')) return;
      
      e.stopPropagation();
      onSelect();
      
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;

      setIsDragging(true);
      setDragStart({
        x: e.clientX - canvasRect.left - position.x,
        y: e.clientY - canvasRect.top - position.y,
      });
    };

    useEffect(() => {
      if (!isDragging) return;

      const handleMouseMove = (e: MouseEvent) => {
        const canvasRect = canvasRef.current?.getBoundingClientRect();
        if (!canvasRect) return;

        // Calcola posizione relativa al canvas (considerando scroll)
        const scrollLeft = canvasRef.current?.scrollLeft || 0;
        const scrollTop = canvasRef.current?.scrollTop || 0;
        
        let newX = e.clientX - canvasRect.left - dragStart.x + scrollLeft;
        let newY = e.clientY - canvasRect.top - dragStart.y + scrollTop;

        // Ottieni le guide per snap magnetico
        const guides = getGuideLines(
          canvasRect.width,
          canvasRect.height,
          components,
          component.id
        );

        // Applica snap magnetico
        const snapResult = snapToGuides(
          newX,
          newY,
          position.width,
          position.height,
          guides,
          8 // snap threshold in pixels
        );

        // Aggiorna guide attive per visualizzazione
        onGuidesChange(snapResult.activeGuides);

        // Snap to grid (20px) come fallback se non c'è snap alle guide
        const finalX = snapResult.activeGuides.length > 0 
          ? snapResult.x 
          : Math.round(snapResult.x / 20) * 20;
        const finalY = snapResult.activeGuides.length > 0 
          ? snapResult.y 
          : Math.round(snapResult.y / 20) * 20;

        onUpdatePosition({
          x: Math.max(0, finalX),
          y: Math.max(0, finalY),
          width: position.width,
          height: position.height,
        });
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        onGuidesChange([]); // Pulisci le guide quando termina il drag
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }, [isDragging, dragStart, position, onUpdatePosition, canvasRef, components, component.id, onGuidesChange]);

    return (
      <div
        ref={elementRef}
        className={cn(
          "absolute border-2 transition-colors",
          isSelected ? "border-primary shadow-lg" : "border-transparent hover:border-border",
          isDragging && "opacity-70 cursor-grabbing"
        )}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${position.width}px`,
          height: `${position.height}px`,
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Drag handle */}
        {isSelected && (
          <div className="absolute -top-6 left-0 right-0 h-6 bg-primary text-primary-foreground text-xs flex items-center px-2 rounded-t cursor-grab active:cursor-grabbing">
            <GripVertical className="h-3 w-3 mr-1" />
            <span className="truncate">{component.component_type}</span>
          </div>
        )}

        {/* Component content */}
        <div className="w-full h-full pointer-events-none">
          <ComponentRenderer type={component.component_type} props={component.props} />
        </div>

        {/* Resize handles (for future implementation) */}
        {isSelected && (
          <>
            <div className="resize-handle absolute -right-1 -bottom-1 w-3 h-3 bg-primary rounded-full cursor-se-resize" />
          </>
        )}
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.component.id === next.component.id &&
      JSON.stringify(prev.component.position) === JSON.stringify(next.component.position) &&
      JSON.stringify(prev.component.props) === JSON.stringify(next.component.props) &&
      prev.isSelected === next.isSelected
    );
  }
);

CanvasElement.displayName = 'CanvasElement';
