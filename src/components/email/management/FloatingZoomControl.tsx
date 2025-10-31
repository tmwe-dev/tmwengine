/**
 * Floating Zoom Control - Galleggiante a destra della pagina
 */
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut } from 'lucide-react';

interface FloatingZoomControlProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

export function FloatingZoomControl({ zoom, onZoomChange }: FloatingZoomControlProps) {
  return (
    <div 
      className="fixed right-6 top-1/2 -translate-y-1/2 z-50 bg-background/95 backdrop-blur-sm border-2 border-primary/30 rounded-xl p-4 shadow-2xl"
      style={{ width: '80px' }}
    >
      <div className="flex flex-col items-center gap-3">
        {/* Icona Zoom In */}
        <ZoomIn className="h-5 w-5 text-primary" />
        
        {/* Label 200% */}
        <span className="text-xs font-semibold text-primary">200%</span>
        
        {/* Slider Verticale */}
        <Slider
          value={[zoom]}
          onValueChange={([val]) => onZoomChange(val)}
          min={0.5}
          max={2.0}
          step={0.01}
          orientation="vertical"
          className="h-[180px]"
        />
        
        {/* Label 50% */}
        <span className="text-xs font-semibold text-primary">50%</span>
        
        {/* Icona Zoom Out */}
        <ZoomOut className="h-5 w-5 text-primary" />
        
        {/* Percentuale corrente */}
        <div className="mt-2 pt-2 border-t border-primary/30">
          <span className="text-sm font-bold text-primary">
            {Math.round(zoom * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}
