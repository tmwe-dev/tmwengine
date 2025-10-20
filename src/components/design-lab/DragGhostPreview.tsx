import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ExtractedComponent } from '@/types/design-lab-scanner';

interface DragGhostPreviewProps {
  component: ExtractedComponent | null;
  position: { x: number; y: number } | null;
  snapToGrid?: boolean;
  gridSize?: number;
}

export function DragGhostPreview({
  component,
  position,
  snapToGrid = false,
  gridSize = 8,
}: DragGhostPreviewProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !component || !position) return null;

  const snapPosition = snapToGrid
    ? {
        x: Math.round(position.x / gridSize) * gridSize,
        y: Math.round(position.y / gridSize) * gridSize,
      }
    : position;

  const ghostElement = (
    <div
      className="fixed pointer-events-none z-[9999] opacity-60"
      style={{
        left: `${snapPosition.x}px`,
        top: `${snapPosition.y}px`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div className="bg-primary/20 border-2 border-primary border-dashed rounded-lg p-4 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          {component.thumbnail_url && (
            <img
              src={component.thumbnail_url}
              alt={component.component_name}
              className="w-12 h-12 object-cover rounded border"
            />
          )}
          <div>
            <p className="text-sm font-semibold text-primary">
              {component.component_name}
            </p>
            <p className="text-xs text-primary/70">
              {component.component_type}
            </p>
          </div>
        </div>
        
        {/* Size indicator */}
        <div className="mt-2 text-xs text-primary/60 font-mono">
          Posizione: {snapPosition.x}, {snapPosition.y}
        </div>
      </div>
    </div>
  );

  return createPortal(ghostElement, document.body);
}
