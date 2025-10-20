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
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (component && position) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [component, position]);

  if (!mounted || !component || !position) return null;

  const snapPosition = snapToGrid
    ? {
        x: Math.round(position.x / gridSize) * gridSize,
        y: Math.round(position.y / gridSize) * gridSize,
      }
    : position;

  const ghostElement = (
    <div
      className={`fixed pointer-events-none z-[9999] transition-all duration-200 ${
        visible ? 'opacity-80 scale-100' : 'opacity-0 scale-95'
      }`}
      style={{
        left: `${snapPosition.x}px`,
        top: `${snapPosition.y}px`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div className="bg-primary/20 border-2 border-primary border-dashed rounded-lg p-4 backdrop-blur-sm shadow-lg animate-fade-in">
        <div className="flex items-center gap-2">
          {component.thumbnail_url && (
            <img
              src={component.thumbnail_url}
              alt={component.component_name}
              className="w-12 h-12 object-cover rounded border border-primary/30 shadow-sm"
            />
          )}
          <div>
            <p className="text-sm font-semibold text-primary">
              {component.component_name}
            </p>
            <p className="text-xs text-primary/70">
              {component.component_type}
            </p>
            {component.ui_category && (
              <span className="inline-block mt-1 px-2 py-0.5 text-[10px] rounded-full bg-primary/10 text-primary font-medium">
                {component.ui_category}
              </span>
            )}
          </div>
        </div>
        
        {/* Position indicator with snap feedback */}
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="text-xs text-primary/60 font-mono">
            x: {snapPosition.x}, y: {snapPosition.y}
          </div>
          {snapToGrid && (
            <div className="flex items-center gap-1 text-[10px] text-primary/70">
              <div className="w-2 h-2 bg-primary/40 rounded-sm animate-pulse" />
              Snap
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(ghostElement, document.body);
}
