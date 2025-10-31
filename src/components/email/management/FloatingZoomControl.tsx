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
  position?: 'left' | 'right';
}

export function FloatingZoomControl({ 
  zoom, 
  onZoomChange,
  verticalOffset,
  onVerticalOffsetChange,
  position = 'right'
}: FloatingZoomControlProps) {
  const [isActive, setIsActive] = useState(false);

  return (
    <div 
      className={`fixed top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-4 transition-transform duration-300 ${
        position === 'left' ? 'left-14' : 'right-6'
      }`}
      onMouseEnter={() => setIsActive(true)}
      onMouseLeave={() => setIsActive(false)}
    >
      {/* SLIDER 1: ZOOM */}
      <div className="flex flex-col items-center">
        <div className={`mb-1 px-1.5 py-0.5 bg-background/90 backdrop-blur-sm rounded border border-purple-500/50 transition-opacity duration-200 ${
          isActive ? 'opacity-100' : 'opacity-0'
        }`}>
          <span className="text-[10px] font-bold text-purple-500">
            {Math.round(zoom * 100)}%
          </span>
        </div>
        
        <Slider
          minimal
          value={[zoom]}
          onValueChange={([val]) => onZoomChange(val)}
          min={0.5}
          max={2.0}
          step={0.01}
          orientation="vertical"
          className="h-[140px] w-1"
        />
        
        <span className={`text-[10px] text-muted-foreground mt-1 transition-opacity duration-200 ${
          isActive ? 'opacity-100' : 'opacity-0'
        }`}>Zoom</span>
      </div>

      {/* SEPARATORE */}
      <div className="w-6 h-px bg-border" />

      {/* SLIDER 2: POSIZIONE VERTICALE */}
      <div className="flex flex-col items-center">
        <div className={`mb-1 px-1.5 py-0.5 bg-background/90 backdrop-blur-sm rounded border border-blue-500/50 transition-opacity duration-200 ${
          isActive ? 'opacity-100' : 'opacity-0'
        }`}>
          <span className="text-[10px] font-bold text-blue-500">
            {verticalOffset > 0 ? '+' : ''}{verticalOffset}px
          </span>
        </div>
        
        <Slider
          minimal
          value={[verticalOffset]}
          onValueChange={([val]) => onVerticalOffsetChange(val)}
          min={-200}
          max={200}
          step={5}
          orientation="vertical"
          className="h-[140px] w-1"
        />
        
        <span className={`text-[10px] text-muted-foreground mt-1 transition-opacity duration-200 ${
          isActive ? 'opacity-100' : 'opacity-0'
        }`}>Pos</span>
      </div>
    </div>
  );
}
