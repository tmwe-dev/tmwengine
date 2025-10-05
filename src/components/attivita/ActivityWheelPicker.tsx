import React, { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type FilterType = 'all' | 'future' | 'scadute';

interface ActivityWheelPickerProps {
  children: React.ReactNode[];
  onIndexChange?: (index: number) => void;
  itemHeight?: number;
  onFilterChange?: (filter: FilterType) => void;
  activeFilter?: FilterType;
  stats?: {
    totali: number;
    future: number;
    scadute: number;
  };
}

export function ActivityWheelPicker({ 
  children, 
  onIndexChange,
  itemHeight = 400,
  onFilterChange,
  activeFilter = 'all',
  stats = { totali: 0, future: 0, scadute: 0 }
}: ActivityWheelPickerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [rotation, setRotation] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();

  const totalItems = children.length;
  const anglePerItem = 360 / Math.min(totalItems, 7); // Max 7 items visible in wheel

  useEffect(() => {
    onIndexChange?.(currentIndex);
  }, [currentIndex, onIndexChange]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    setCurrentY(e.touches[0].clientY);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const touch = e.touches[0];
    setCurrentY(touch.clientY);
    
    const deltaY = touch.clientY - startY;
    const sensitivity = 0.5;
    const newRotation = rotation + (deltaY * sensitivity);
    setRotation(newRotation);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    
    // Snap to nearest item
    const itemsRotated = Math.round(rotation / anglePerItem);
    const newIndex = ((currentIndex - itemsRotated) % totalItems + totalItems) % totalItems;
    const targetRotation = itemsRotated * anglePerItem;
    
    // Smooth snap animation
    const startRot = rotation;
    const diff = targetRotation - startRot;
    const duration = 300;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      
      setRotation(startRot + diff * eased);
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setRotation(targetRotation);
        setCurrentIndex(newIndex);
      }
    };
    
    animate();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartY(e.clientY);
    setCurrentY(e.clientY);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    setCurrentY(e.clientY);
    const deltaY = e.clientY - startY;
    const sensitivity = 0.5;
    const newRotation = rotation + (deltaY * sensitivity);
    setRotation(newRotation);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    handleTouchEnd();
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1 : -1;
    navigateToIndex(currentIndex + delta);
  };

  const navigateToIndex = (newIndex: number) => {
    if (newIndex < 0 || newIndex >= totalItems) return;
    
    const itemsDiff = newIndex - currentIndex;
    const targetRotation = rotation - (itemsDiff * anglePerItem);
    
    // Smooth animation
    const startRot = rotation;
    const diff = targetRotation - startRot;
    const duration = 400;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      
      setRotation(startRot + diff * eased);
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setRotation(targetRotation);
        setCurrentIndex(newIndex);
      }
    };
    
    animate();
  };

  const getItemStyle = (index: number): React.CSSProperties => {
    const position = (index - currentIndex + totalItems) % totalItems;
    const angle = position * anglePerItem - rotation;
    const radius = itemHeight * 1.2;
    
    // Calculate 3D position
    const rotationX = angle;
    const translateZ = radius;
    
    // Calculate opacity and scale based on position
    const normalizedAngle = ((angle % 360) + 360) % 360;
    const distanceFromCenter = Math.min(
      Math.abs(normalizedAngle),
      Math.abs(360 - normalizedAngle)
    );
    
    const opacity = Math.max(0.2, 1 - (distanceFromCenter / 180));
    const scale = Math.max(0.7, 1 - (distanceFromCenter / 360));
    
    return {
      transform: `rotateX(${rotationX}deg) translateZ(${translateZ}px) scale(${scale})`,
      opacity,
      zIndex: Math.round((1 - distanceFromCenter / 180) * 100),
    };
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Filter buttons at top */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 flex gap-2 bg-background/95 backdrop-blur-sm border border-border rounded-full p-1.5 shadow-lg">
        <Button
          variant={activeFilter === 'all' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => {
            onFilterChange?.('all');
            setCurrentIndex(0);
            setRotation(0);
          }}
          className={cn(
            "h-8 px-3 text-xs rounded-full transition-all",
            activeFilter === 'all' && "shadow-md"
          )}
        >
          <span className="font-semibold">{stats.totali}</span>
          <span className="ml-1.5">Totali</span>
        </Button>
        
        <Button
          variant={activeFilter === 'future' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => {
            onFilterChange?.('future');
            setCurrentIndex(0);
            setRotation(0);
          }}
          className={cn(
            "h-8 px-3 text-xs rounded-full transition-all",
            activeFilter === 'future' && "shadow-md bg-orange-600 hover:bg-orange-700"
          )}
        >
          <span className="font-semibold">{stats.future}</span>
          <span className="ml-1.5">In Sospeso</span>
        </Button>
        
        <Button
          variant={activeFilter === 'scadute' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => {
            onFilterChange?.('scadute');
            setCurrentIndex(0);
            setRotation(0);
          }}
          className={cn(
            "h-8 px-3 text-xs rounded-full transition-all",
            activeFilter === 'scadute' && "shadow-md bg-red-600 hover:bg-red-700"
          )}
        >
          <span className="font-semibold">{stats.scadute}</span>
          <span className="ml-1.5">Scadute</span>
        </Button>
      </div>

      {/* Navigation arrows */}
      <button
        onClick={() => navigateToIndex(currentIndex - 1)}
        disabled={currentIndex === 0}
        className={cn(
          "absolute top-20 left-1/2 -translate-x-1/2 z-50",
          "w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm",
          "border border-border shadow-lg",
          "flex items-center justify-center",
          "transition-opacity",
          currentIndex === 0 && "opacity-30 cursor-not-allowed"
        )}
      >
        <ChevronUp className="h-6 w-6" />
      </button>

      {/* Wheel container */}
      <div
        ref={containerRef}
        className="relative w-full h-full"
        style={{
          perspective: '1200px',
          perspectiveOrigin: 'center center',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transformStyle: 'preserve-3d',
          }}
        >
          {children.map((child, index) => (
            <div
              key={index}
              className={cn(
                "absolute w-full px-4 transition-all duration-200",
                isDragging ? "cursor-grabbing" : "cursor-grab"
              )}
              style={{
                ...getItemStyle(index),
                height: `${itemHeight}px`,
                transformStyle: 'preserve-3d',
                backfaceVisibility: 'hidden',
              }}
            >
              {child}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom arrow */}
      <button
        onClick={() => navigateToIndex(currentIndex + 1)}
        disabled={currentIndex === totalItems - 1}
        className={cn(
          "absolute bottom-4 left-1/2 -translate-x-1/2 z-50",
          "w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm",
          "border border-border shadow-lg",
          "flex items-center justify-center",
          "transition-opacity",
          currentIndex === totalItems - 1 && "opacity-30 cursor-not-allowed"
        )}
      >
        <ChevronDown className="h-6 w-6" />
      </button>

      {/* Position indicator */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-background/80 backdrop-blur-sm border border-border rounded-full px-4 py-2 shadow-lg">
          <span className="text-sm font-medium">
            {currentIndex + 1} / {totalItems}
          </span>
        </div>
      </div>

      {/* Drag hint */}
      {!isDragging && currentIndex === 0 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none">
          <div className="text-center text-muted-foreground text-sm animate-pulse">
            <div>👆 Trascina verticalmente</div>
            <div className="text-xs mt-1">o usa le frecce</div>
          </div>
        </div>
      )}
    </div>
  );
}
