/**
 * Card draggable mittente - Sistema nativo drag (stile Design Lab)
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SenderAnalysis } from '@/types/email-management';

interface SenderCardProps {
  sender: SenderAnalysis;
  onDragStart?: (sender: SenderAnalysis, offsetX: number, offsetY: number) => void;
  onDragMove?: (sender: SenderAnalysis, clientX: number, clientY: number) => void;
  onDragEnd?: (sender: SenderAnalysis, clientX: number, clientY: number) => void;
  onDoubleClick?: (sender: SenderAnalysis) => void;
}

export function SenderCard({ 
  sender, 
  onDragStart, 
  onDragMove, 
  onDragEnd, 
  onDoubleClick 
}: SenderCardProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    setIsDragging(true);
    onDragStart?.(sender, offsetX, offsetY);
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      onDragMove?.(sender, moveEvent.clientX, moveEvent.clientY);
    };
    
    const handleMouseUp = (upEvent: MouseEvent) => {
      setIsDragging(false);
      onDragEnd?.(sender, upEvent.clientX, upEvent.clientY);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <>
      {/* Original card */}
      <div className={cn("snap-start", isDragging && "opacity-30")}>
        <Card 
          onMouseDown={handleMouseDown}
          onDoubleClick={() => onDoubleClick?.(sender)}
          className={cn(
            "border-l-4 transition-shadow cursor-grab",
            "hover:scale-[1.02]",
            sender.emailCount > 50 && "border-l-orange-500",
            sender.emailCount > 100 && "border-l-red-500",
            isDragging && "cursor-grabbing"
          )}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
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
              <div className="text-2xl font-bold text-primary flex-shrink-0">
                {sender.emailCount}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
