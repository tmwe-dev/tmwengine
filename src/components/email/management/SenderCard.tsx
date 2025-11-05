/**
 * Card draggable mittente - Sistema isolato FunEmail
 */

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
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
  const { attributes, listeners, setNodeRef, transform, isDragging: dragActive } = useDraggable({
    id: sender.email,
    data: sender,
  });

  // ✅ Applica transform per seguire il mouse + nasconde card originale durante drag
  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: dragActive && !isDragging ? 0 : 1,
    transition: 'opacity 0.15s ease-out'
  };

  return (
    <div ref={setNodeRef} style={style} className="snap-start">
      <Card 
        {...listeners}
        {...attributes}
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
