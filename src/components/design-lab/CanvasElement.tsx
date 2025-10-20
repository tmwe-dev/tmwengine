import { memo, useState, useRef, useEffect, RefObject } from "react";
import { cn } from "@/lib/utils";
import { DesignLabComponent } from "@/types/design-lab";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { GripVertical } from "lucide-react";
import { GuideLine, DistanceInfo, getGuideLines, snapToGuides, calculateNearestDistances } from "@/lib/design-lab/snap-guides";

interface CanvasElementProps {
  component: DesignLabComponent;
  isSelected: boolean;
  onSelect: () => void;
  onUpdatePosition: (position: { x: number; y: number; width: number; height: number }) => void;
  canvasRef: RefObject<HTMLDivElement>;
  components: DesignLabComponent[];
  onGuidesChange: (guides: GuideLine[]) => void;
  onDistancesChange: (distances: DistanceInfo[]) => void;
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
    onGuidesChange,
    onDistancesChange
  }: CanvasElementProps) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [localPosition, setLocalPosition] = useState<{ x: number; y: number } | null>(null);

  const position = component.position as { x: number; y: number; width: number; height: number };
  
  // Durante il drag usa localPosition, altrimenti usa position dal componente
  const displayPosition = localPosition || { x: position.x, y: position.y };

  // Bug fix: sincronizza localPosition dopo aggiornamento del parent
  useEffect(() => {
    if (!isDragging && localPosition) {
      // Aspetta che position sia sincronizzato (con tolleranza di 1px per arrotondamenti)
      const isPositionSynced = 
        Math.abs(position.x - localPosition.x) < 1 && 
        Math.abs(position.y - localPosition.y) < 1;
      
      if (isPositionSynced) {
        console.log('✅ Position synced, resetting localPosition');
        setLocalPosition(null);
      }
    }
  }, [position.x, position.y, localPosition, isDragging]);

  // Timeout di sicurezza per resettare localPosition dopo 2s se sync fallisce
  useEffect(() => {
    if (localPosition && !isDragging) {
      const timeout = setTimeout(() => {
        console.warn('⚠️ Position sync timeout, forcing reset');
        setLocalPosition(null);
      }, 2000);
      
      return () => clearTimeout(timeout);
    }
  }, [localPosition, isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.resize-handle')) return;
    
    e.stopPropagation();
    onSelect();
    
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    // Inizializza localPosition con la posizione corrente
    setLocalPosition({ x: position.x, y: position.y });
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

      // Ottieni le guide per snap magnetico (inclusa griglia 10x10)
      const guides = getGuideLines(
        canvasRect.width,
        canvasRect.height,
        components,
        component.id,
        true // includeGrid
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

      // Calcola distanze con elementi vicini
      const distances = calculateNearestDistances(
        snapResult.x,
        snapResult.y,
        position.width,
        position.height,
        components,
        component.id,
        60 // threshold in pixels
      );

      // Aggiorna guide e distanze attive per visualizzazione
      onGuidesChange(snapResult.activeGuides);
      onDistancesChange(distances);

      // Aggiorna SOLO localPosition (niente snap griglia, solo snap magnetico guide)
      setLocalPosition({
        x: Math.max(0, snapResult.x),
        y: Math.max(0, snapResult.y),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      onGuidesChange([]);
      onDistancesChange([]);
      
      // Salva la posizione finale nel database
      if (localPosition) {
        onUpdatePosition({
          x: localPosition.x,
          y: localPosition.y,
          width: position.width,
          height: position.height,
        });
        // NON resettare localPosition qui - verrà resettato nell'useEffect dopo sync
      }
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
          left: isDragging ? 0 : `${position.x}px`,
          top: isDragging ? 0 : `${position.y}px`,
          transform: isDragging ? `translate(${displayPosition.x}px, ${displayPosition.y}px)` : 'none',
          width: `${position.width}px`,
          height: `${position.height}px`,
          willChange: isDragging ? 'transform' : 'auto',
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
