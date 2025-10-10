import { Button } from '@/components/ui/button';
import { MessageCircle, ArrowRight, Target } from 'lucide-react';

interface TurnControlButtonsProps {
  responseMode: 'all' | 'single' | 'auto';
  onResponseModeChange: (mode: 'all' | 'single' | 'auto') => void;
  onTargetParticipant: (type: string | null) => void;
  participants: Array<{ type: string; name: string; is_active: boolean }>;
  isLoading: boolean;
}

export const TurnControlButtons = ({
  responseMode,
  onResponseModeChange,
  onTargetParticipant,
  participants,
  isLoading
}: TurnControlButtonsProps) => {
  const activeAIs = participants.filter(p => p.type !== 'human' && p.is_active);

  const getParticipantIcon = (type: string) => {
    switch (type) {
      case 'chatgpt': return '🤖';
      case 'gemini': return '🔷';
      case 'claude': return '🧠';
      default: return '🎭';
    }
  };

  return (
    <div className="flex flex-wrap gap-2 p-2 bg-muted/30 rounded-lg border">
      <Button
        variant={responseMode === 'all' ? 'default' : 'outline'}
        size="sm"
        onClick={() => {
          onResponseModeChange('all');
          onTargetParticipant(null);
        }}
        disabled={isLoading || activeAIs.length === 0}
        className="gap-2"
      >
        <MessageCircle className="h-4 w-4" />
        Tutti rispondano ({activeAIs.length})
      </Button>

      <Button
        variant={responseMode === 'auto' ? 'default' : 'outline'}
        size="sm"
        onClick={() => {
          onResponseModeChange('auto');
          onTargetParticipant(null);
        }}
        disabled={isLoading || activeAIs.length === 0}
        className="gap-2"
      >
        <ArrowRight className="h-4 w-4" />
        Turno Automatico
      </Button>

      <div className="w-px bg-border" />

      {activeAIs.map((participant) => (
        <Button
          key={participant.type}
          variant="outline"
          size="sm"
          onClick={() => {
            onResponseModeChange('single');
            onTargetParticipant(participant.type);
          }}
          disabled={isLoading}
          className="gap-2"
        >
          <span>{getParticipantIcon(participant.type)}</span>
          <Target className="h-3 w-3" />
          {participant.name}
        </Button>
      ))}
    </div>
  );
};
