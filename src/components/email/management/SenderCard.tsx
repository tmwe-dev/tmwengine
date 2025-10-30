/**
 * Card draggable mittente - Sistema isolato FunEmail
 */

import { useDraggable } from '@dnd-kit/core';
import { Card, CardContent } from '@/components/ui/card';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SenderAnalysis } from '@/types/email-management';

interface FunEmailSenderCardProps {
  sender: SenderAnalysis;
  isDragging?: boolean;
}

export function SenderCard({ sender, isDragging }: FunEmailSenderCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging: dragActive } = useDraggable({
    id: sender.email,
    data: sender,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: dragActive ? 0.5 : 1,
  } : { opacity: 1 };

  return (
    <div ref={setNodeRef} style={style} className="transition-all snap-start">
      <Card className={cn(
        "cursor-grab active:cursor-grabbing border-l-4",
        "transition-all duration-200",
        "hover:shadow-lg hover:scale-105 hover:-translate-y-1",
        isDragging && "rotate-2 scale-105 shadow-2xl",
        sender.emailCount > 50 && "border-l-orange-500",
        sender.emailCount > 100 && "border-l-red-500"
      )}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            {/* SINISTRA: Grip + Company + Email */}
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div {...listeners} {...attributes} className="mt-1 cursor-grab active:cursor-grabbing">
                <GripVertical className="h-5 w-5 text-muted-foreground hover:text-primary" />
              </div>
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
