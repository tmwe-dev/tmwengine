/**
 * Card draggable mittente - Sistema isolato FunEmail
 */

import { useDraggable } from '@dnd-kit/core';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GripVertical, Mail, Calendar, Paperclip, TrendingUp } from 'lucide-react';
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
    <div ref={setNodeRef} style={style} className="transition-all">
      <Card className={cn(
        "hover:shadow-lg transition-shadow cursor-grab active:cursor-grabbing border-l-4",
        isDragging && "rotate-2 scale-105 shadow-2xl",
        sender.emailCount > 50 && "border-l-orange-500",
        sender.emailCount > 100 && "border-l-red-500"
      )}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div {...listeners} {...attributes} className="mt-1 cursor-grab active:cursor-grabbing">
              <GripVertical className="h-7 w-7 text-muted-foreground hover:text-primary" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-semibold text-xl truncate mb-2">
                {sender.companyName}
              </div>
              
              <div className="text-sm text-muted-foreground truncate flex items-center gap-1 mb-3">
                <Mail className="h-4 w-4 flex-shrink-0" />
                {sender.email}
              </div>

              <div className="flex gap-2 flex-wrap mb-3">
                <Badge variant="secondary" className="text-sm font-bold">
                  {sender.emailCount} email
                </Badge>
                
                {sender.hasAttachments && (
                  <Badge variant="outline" className="text-sm">
                    <Paperclip className="h-4 w-4 mr-1" />
                    Allegati
                  </Badge>
                )}
                
                <Badge variant="outline" className="text-sm">
                  <Calendar className="h-4 w-4 mr-1" />
                  {new Date(sender.lastSeen).toLocaleDateString('it-IT')}
                </Badge>
              </div>

              {sender.topSubjectKeywords.length > 0 && (
                <div className="text-sm text-muted-foreground flex items-start gap-1">
                  <TrendingUp className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span className="truncate">
                    {sender.topSubjectKeywords.slice(0, 3).join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
