import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResultCardProps {
  rank: number;
  name: string;
  time: number;
  vsBaseline: number;
  onSave: () => void;
  onActivate: () => void;
  isActive: boolean;
  isSaved?: boolean;
}

export function ResultCard({
  rank,
  name,
  time,
  vsBaseline,
  onSave,
  onActivate,
  isActive,
  isSaved = false
}: ResultCardProps) {
  const getRankEmoji = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `${rank}`;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'text-yellow-500';
      case 2: return 'text-gray-400';
      case 3: return 'text-amber-600';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Card className={cn(
      "p-3 transition-all",
      isActive && "ring-2 ring-primary bg-primary/5"
    )}>
      <div className="flex items-center justify-between gap-3">
        {/* Rank & Name */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className={cn("text-xl font-bold min-w-[2rem] text-center", getRankColor(rank))}>
            {getRankEmoji(rank)}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{name}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs font-mono">
                {time}ms
              </Badge>
              {vsBaseline !== 0 && (
                <span className={cn(
                  "text-xs font-medium",
                  vsBaseline > 0 ? "text-destructive" : "text-success"
                )}>
                  {vsBaseline > 0 ? '+' : ''}{vsBaseline.toFixed(1)}%
                </span>
              )}
              {isActive && (
                <Badge variant="default" className="text-xs">
                  ✅ Attivo
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            onClick={onSave}
            disabled={isSaved}
            title="Salva profilo"
          >
            <Save className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant={isActive ? "default" : "outline"}
            onClick={onActivate}
            disabled={isActive}
            title="Attiva profilo"
          >
            <Check className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
