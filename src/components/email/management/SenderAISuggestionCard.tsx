import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, Tag, Check, X, Sparkles, TrendingUp } from 'lucide-react';
import type { AISuggestion } from '@/types/email-management';
import { cn } from '@/lib/utils';

interface SenderAISuggestionCardProps {
  suggestion: AISuggestion;
  onAccept: (suggestion: AISuggestion) => void;
  onReject: (suggestionId: string) => void;
  disabled?: boolean;
}

export const SenderAISuggestionCard = ({
  suggestion,
  onAccept,
  onReject,
  disabled = false,
}: SenderAISuggestionCardProps) => {
  const confidencePercent = Math.round(suggestion.confidence * 100);
  const confidenceColor =
    suggestion.confidence >= 0.8
      ? 'text-green-600 bg-green-50'
      : suggestion.confidence >= 0.6
      ? 'text-yellow-600 bg-yellow-50'
      : 'text-orange-600 bg-orange-50';

  return (
    <Card
      className={cn('border-l-4 transition-all', disabled && 'opacity-50')}
      style={{
        borderLeftColor: suggestion.suggested_group.color || '#6366f1',
      }}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Info */}
          <div className="flex-1 space-y-2">
            {/* Sender email */}
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="font-mono text-sm">{suggestion.sender_email}</span>
            </div>

            {/* Suggested group */}
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className="w-4 h-4" />
              <span className="font-semibold text-base">{suggestion.suggested_group.name}</span>
              {suggestion.suggested_group.is_new && (
                <Badge variant="secondary" className="text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  NUOVO GRUPPO
                </Badge>
              )}
              <Badge className={cn('text-xs', confidenceColor)}>
                <TrendingUp className="w-3 h-3 mr-1" />
                {confidencePercent}% sicuro
              </Badge>
            </div>

            {/* Reasoning */}
            <p className="text-sm text-muted-foreground leading-relaxed">{suggestion.reasoning}</p>

            {/* Cost (if not free) */}
            {!suggestion.cost.is_free && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                💰 Costo: €{suggestion.cost.eur.toFixed(4)} (
                {suggestion.cost.tokens_input + suggestion.cost.tokens_output} token)
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex flex-col gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={() => onAccept(suggestion)}
              disabled={disabled}
              className="whitespace-nowrap"
            >
              <Check className="w-4 h-4 mr-1" />
              Accetta
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onReject(suggestion.id)} disabled={disabled}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
