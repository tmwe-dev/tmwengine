/**
 * Card draggable mittente - Sistema nativo drag (come Design Lab)
 */

import { useState, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Card, CardContent } from '@/components/ui/card';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SenderAnalysis } from '@/types/email-management';

interface FunEmailSenderCardProps {
  sender: SenderAnalysis;
  isDragging?: boolean;
  onDoubleClick?: (sender: SenderAnalysis) => void;
  dragOverlayStyle?: boolean;
}

export function SenderCard({ sender, isDragging, onDoubleClick, dragOverlayStyle }: FunEmailSenderCardProps) {
  // ✅ useDraggable SOLO per logica drop detection (necessario per DndContext)
  const { attributes, listeners, setNodeRef, isDragging: dragActive } = useDraggable({
    id: sender.email,
    data: sender,
  });

  // ✅ Sistema drag nativo (come Design Lab)
  const [isManualDragging, setIsManualDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [localPosition, setLocalPosition] = useState({ x: 0, y: 0 });

  // ✅ Handler mouse nativo per controllo diretto
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const rect = e.currentTarget.getBoundingClientRect();
    
    setIsManualDragging(true);
    setLocalPosition({ x: 0, y: 0 });
    setDragStart({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  // ✅ Listener mouse nativi per movimento fluido
  useEffect(() => {
    if (!isManualDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      setLocalPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsManualDragging(false);
      setLocalPosition({ x: 0, y: 0 });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isManualDragging, dragStart]);

  // ✅ Style nativo con transform translate (come Design Lab)
  const style = {
    transform: isManualDragging ? `translate(${localPosition.x}px, ${localPosition.y}px)` : 'none',
    willChange: isManualDragging ? 'transform' : 'auto',
    opacity: dragActive && !isDragging ? 0 : 1,
    transition: isManualDragging ? 'none' : 'opacity 0.15s ease-out',
    cursor: isManualDragging ? 'grabbing' : 'grab',
  };

  return (
    <div ref={setNodeRef} style={style} className="snap-start">
      <Card 
        onMouseDown={handleMouseDown}
        className={cn(
          "cursor-grab active:cursor-grabbing border-l-4 transition-transform",
          "hover:scale-[1.02]",
          sender.emailCount > 50 && "border-l-orange-500",
          sender.emailCount > 100 && "border-l-red-500",
          dragOverlayStyle && "bg-gradient-to-br from-blue-500/35 to-blue-400/25 backdrop-blur-sm border-blue-300/30"
        )}
        onDoubleClick={() => onDoubleClick?.(sender)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            {/* SINISTRA: Grip + Company + Email */}
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <GripVertical className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-lg truncate mb-1">
                  {sender.companyName}
                </div>
                <div className="text-sm text-muted-foreground truncate">
                  {sender.email}
                </div>
              </div>
            </div>
            
            {/* DESTRA: Solo numero email */}
            <div className="text-2xl font-bold text-primary flex-shrink-0">
              {sender.emailCount}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
