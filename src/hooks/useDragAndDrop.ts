import { useState, useCallback } from 'react';
import type { ExtractedComponent } from '@/types/design-lab-scanner';

export interface DragState {
  isDragging: boolean;
  component: ExtractedComponent | null;
  position: { x: number; y: number } | null;
}

export function useDragAndDrop() {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    component: null,
    position: null,
  });

  const handleDragStart = useCallback((component: ExtractedComponent) => {
    setDragState({
      isDragging: true,
      component,
      position: null,
    });
  }, []);

  const handleDragMove = useCallback((x: number, y: number) => {
    setDragState((prev) => ({
      ...prev,
      position: { x, y },
    }));
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragState({
      isDragging: false,
      component: null,
      position: null,
    });
  }, []);

  return {
    dragState,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
  };
}
