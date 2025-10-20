import { useState, useCallback } from 'react';
import { PropsEditorDialog } from './PropsEditorDialog';
import { DragGhostPreview } from './DragGhostPreview';
import type { ExtractedComponent } from '@/types/design-lab-scanner';
import { toast } from 'sonner';

interface CanvasDropZoneProps {
  children: React.ReactNode;
  onComponentDrop: (component: ExtractedComponent, props: Record<string, any>, position: { x: number; y: number }) => void;
  snapToGrid?: boolean;
  gridSize?: number;
}

export function CanvasDropZone({
  children,
  onComponentDrop,
  snapToGrid = false,
  gridSize = 8,
}: CanvasDropZoneProps) {
  const [draggedComponent, setDraggedComponent] = useState<ExtractedComponent | null>(null);
  const [ghostPosition, setGhostPosition] = useState<{ x: number; y: number } | null>(null);
  const [propsEditorOpen, setPropsEditorOpen] = useState(false);
  const [dropPosition, setDropPosition] = useState<{ x: number; y: number } | null>(null);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';

      // Update ghost preview position
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      setGhostPosition({ x, y });
    },
    []
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    
    try {
      const data = e.dataTransfer.getData('application/json');
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.type === 'design-lab-component' && parsed.component) {
          setDraggedComponent(parsed.component);
        }
      }
    } catch (error) {
      console.error('Error parsing drag data:', error);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving the drop zone completely
    if (e.currentTarget === e.target) {
      setDraggedComponent(null);
      setGhostPosition(null);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      
      try {
        const data = e.dataTransfer.getData('application/json');
        if (!data) return;

        const parsed = JSON.parse(data);
        if (parsed.type !== 'design-lab-component' || !parsed.component) return;

        const component = parsed.component as ExtractedComponent;
        
        // Calculate drop position relative to canvas
        const rect = e.currentTarget.getBoundingClientRect();
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;

        // Apply snap to grid if enabled
        if (snapToGrid) {
          x = Math.round(x / gridSize) * gridSize;
          y = Math.round(y / gridSize) * gridSize;
        }

        setDropPosition({ x, y });
        setDraggedComponent(component);

        // Check if component has configurable props
        const hasProps = component.props_schema && Object.keys(component.props_schema).length > 0;

        if (hasProps) {
          // Open props editor
          setPropsEditorOpen(true);
        } else {
          // Insert directly with no props
          onComponentDrop(component, {}, { x, y });
          toast.success(`${component.component_name} inserito nel canvas`);
          setDraggedComponent(null);
          setGhostPosition(null);
        }
      } catch (error) {
        console.error('Error handling drop:', error);
        toast.error('Errore durante l\'inserimento del componente');
      }
    },
    [onComponentDrop, snapToGrid, gridSize]
  );

  const handlePropsConfirm = useCallback(
    (props: Record<string, any>) => {
      if (draggedComponent && dropPosition) {
        onComponentDrop(draggedComponent, props, dropPosition);
        toast.success(`${draggedComponent.component_name} inserito nel canvas`);
      }
      
      setDraggedComponent(null);
      setGhostPosition(null);
      setDropPosition(null);
    },
    [draggedComponent, dropPosition, onComponentDrop]
  );

  return (
    <>
      <div
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="relative w-full h-full"
      >
        {children}
      </div>

      <DragGhostPreview
        component={draggedComponent}
        position={ghostPosition}
        snapToGrid={snapToGrid}
        gridSize={gridSize}
      />

      <PropsEditorDialog
        component={draggedComponent}
        open={propsEditorOpen}
        onOpenChange={setPropsEditorOpen}
        onConfirm={handlePropsConfirm}
      />
    </>
  );
}
