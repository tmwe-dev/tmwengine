/**
 * Floating Zoom Control - Galleggiante a destra della pagina
 * Due slider: zoom carousel e posizione verticale carousel
 */
import { useState } from 'react';
import { Slider } from '@/components/ui/slider';

interface FloatingZoomControlProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  verticalOffset: number;
  onVerticalOffsetChange: (offset: number) => void;
}

export function FloatingZoomControl({ 
  zoom, 
  onZoomChange,
  verticalOffset,
  onVerticalOffsetChange
}: FloatingZoomControlProps) {
  const [isActive, setIsActive] = useState(false);

  return (
    <div 
      className="fixed right-6 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-8"
      onMouseEnter={() => setIsActive(true)}
      onMouseLeave={() => setIsActive(false)}
    >
      {/* SLIDER 1: ZOOM */}
      <div className="flex flex-col items-center">
        {isActive && (
          <div className="mb-2 px-2 py-1 bg-background/90 backdrop-blur-sm rounded border border-purple-500/50 animate-in fade-in duration-200">
            <span className="text-xs font-bold text-purple-500">
              {Math.round(zoom * 100)}%
            </span>
          </div>
        )}
        
        <Slider
          minimal
          value={[zoom]}
          onValueChange={([val]) => onZoomChange(val)}
          min={0.5}
          max={2.0}
          step={0.01}
          orientation="vertical"
          className="h-[180px]"
        />
        
        {isActive && (
          <span className="text-xs text-muted-foreground mt-2">Zoom</span>
        )}
      </div>

      {/* SEPARATORE */}
      <div className="w-8 h-px bg-border" />

      {/* SLIDER 2: POSIZIONE VERTICALE */}
      <div className="flex flex-col items-center">
        {isActive && (
          <div className="mb-2 px-2 py-1 bg-background/90 backdrop-blur-sm rounded border border-blue-500/50 animate-in fade-in duration-200">
            <span className="text-xs font-bold text-blue-500">
              {verticalOffset > 0 ? '+' : ''}{verticalOffset}px
            </span>
          </div>
        )}
        
        <Slider
          minimal
          value={[verticalOffset]}
          onValueChange={([val]) => onVerticalOffsetChange(val)}
          min={-200}
          max={200}
          step={5}
          orientation="vertical"
          className="h-[180px]"
        />
        
        {isActive && (
          <span className="text-xs text-muted-foreground mt-2">Posizione</span>
        )}
      </div>
    </div>
  );
}
