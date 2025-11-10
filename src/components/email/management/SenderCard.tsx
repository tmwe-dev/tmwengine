/**
 * Card draggable mittente - Sistema nativo drag (come Design Lab)
 */

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

  // 🎨 Style stile Design Lab: transform + opacity durante drag
  const style = {
    opacity: dragActive ? 0.7 : 1,
    transform: dragActive ? 'scale(1.05) rotate(2deg)' : 'scale(1)',
    transition: 'opacity 0.2s ease-out, transform 0.2s ease-out',
    cursor: dragActive ? 'grabbing' : 'grab',
    zIndex: dragActive ? 50 : 'auto',
    willChange: dragActive ? 'transform, opacity' : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} className="snap-start">
      <Card 
        {...listeners}
        {...attributes}
        className={cn(
          "border-l-4 transition-shadow",
          "hover:scale-[1.02]",
          dragActive && "shadow-2xl",
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
