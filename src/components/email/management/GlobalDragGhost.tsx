/**
 * GlobalDragGhost - Ghost element globale per drag & drop
 * Risolve i problemi di offset causati da scroll e layout nidificati
 */

import { Card, CardContent } from '@/components/ui/card';
import { GripVertical } from 'lucide-react';
import type { SenderAnalysis } from '@/types/email-management';

interface GlobalDragGhostProps {
  sender: SenderAnalysis;
  clientX: number;
  clientY: number;
  offsetX: number;
  offsetY: number;
}

export function GlobalDragGhost({ 
  sender, 
  clientX, 
  clientY, 
  offsetX, 
  offsetY 
}: GlobalDragGhostProps) {
  return (
    <div
      className="fixed pointer-events-none z-[9999]"
      style={{
        left: `${clientX - offsetX}px`,
        top: `${clientY - offsetY}px`,
        width: '380px',
      }}
    >
      <Card className="shadow-2xl rotate-[0.5deg] bg-gradient-to-br from-blue-500/35 to-blue-400/25 backdrop-blur-sm border-blue-300/30">
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
  );
}
