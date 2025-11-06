/**
 * Card per visualizzare suggerimenti AI di raggruppamento mittenti
 */

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Check, X, Sparkles, TrendingUp } from 'lucide-react';
import type { GroupingSuggestion } from '@/types/email-management';
import { cn } from '@/lib/utils';

interface GroupingSuggestionCardProps {
  suggestion: GroupingSuggestion;
  onAccept: (suggestionId: string, groupId: string | null, groupName: string) => void;
  onDismiss: (suggestionId: string) => void;
  disabled?: boolean;
}

export const GroupingSuggestionCard = ({
  suggestion,
  onAccept,
  onDismiss,
  disabled = false,
}: GroupingSuggestionCardProps) => {
  return (
    <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm flex items-center gap-2 mb-1">
            <Mail className="w-4 h-4" />
            <span className="truncate">{suggestion.sender_email}</span>
          </h4>
          <p className="text-xs text-muted-foreground">
            Analizzato {new Date(suggestion.analyzed_at).toLocaleString('it-IT', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {suggestion.suggested_groups.map((group, index) => {
          const confidencePercent = Math.round(group.confidence * 100);
          const confidenceColor =
            group.confidence >= 0.8
              ? 'text-success bg-success/10'
              : group.confidence >= 0.6
              ? 'text-warning bg-warning/10'
              : 'text-muted-foreground bg-muted';

          return (
            <div
              key={index}
              className={cn(
                'p-3 rounded-lg border transition-all',
                index === 0 ? 'bg-card border-primary/30' : 'bg-muted/50 border-border/50'
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm truncate">{group.group_name}</span>
                    {group.group_id === null && (
                      <Badge variant="outline" className="text-xs">
                        Nuovo
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{group.reason}</p>
                </div>
                <Badge variant="secondary" className={cn('text-xs font-medium', confidenceColor)}>
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {confidencePercent}%
                </Badge>
              </div>

              {index === 0 && (
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={() => onAccept(suggestion.id, group.group_id, group.group_name)}
                    disabled={disabled}
                    className="flex-1"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Accetta
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAccept(suggestion.id, group.group_id, group.group_name)}
                    disabled={disabled}
                  >
                    <Check className="w-3 h-3" />
                  </Button>
                </div>
              )}

              {index > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onAccept(suggestion.id, group.group_id, group.group_name)}
                  disabled={disabled}
                  className="w-full mt-2 text-xs h-7"
                >
                  <Check className="w-3 h-3 mr-1" />
                  Usa questo
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <Button
        size="sm"
        variant="ghost"
        onClick={() => onDismiss(suggestion.id)}
        disabled={disabled}
        className="w-full mt-3 text-xs text-muted-foreground hover:text-destructive"
      >
        <X className="w-3 h-3 mr-1" />
        Ignora suggerimenti
      </Button>
    </Card>
  );
};
