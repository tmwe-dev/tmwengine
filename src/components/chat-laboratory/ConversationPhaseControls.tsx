import { Button } from '@/components/ui/button';
import { MessageSquare, Handshake, CheckCircle, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ConversationPhaseControlsProps {
  currentPhase: 'discussion' | 'convergence' | 'concluded';
  onPhaseChange: (phase: 'discussion' | 'convergence' | 'concluded') => void;
  onRequestSynthesis: () => void;
  isLoading: boolean;
  messageCount: number;
}

export const ConversationPhaseControls = ({
  currentPhase,
  onPhaseChange,
  onRequestSynthesis,
  isLoading,
  messageCount
}: ConversationPhaseControlsProps) => {
  const phases = [
    { 
      id: 'discussion' as const, 
      icon: MessageSquare, 
      label: 'Discussione',
      description: 'Le AI non vedono le risposte altrui',
      color: 'bg-blue-500'
    },
    { 
      id: 'convergence' as const, 
      icon: Handshake, 
      label: 'Convergenza',
      description: 'Le AI vedono tutte le risposte per convergere',
      color: 'bg-amber-500'
    },
    { 
      id: 'concluded' as const, 
      icon: CheckCircle, 
      label: 'Conclusa',
      description: 'Discussione terminata con sintesi finale',
      color: 'bg-green-500'
    }
  ];

  const currentPhaseData = phases.find(p => p.id === currentPhase);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="gap-2">
            {currentPhaseData && <currentPhaseData.icon className="h-3 w-3" />}
            Fase: {currentPhaseData?.label}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {messageCount} messaggi
          </span>
        </div>

        {currentPhase === 'convergence' && (
          <Button
            size="sm"
            onClick={onRequestSynthesis}
            disabled={isLoading}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Chiedi Sintesi Finale
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        {phases.map((phase, index) => {
          const Icon = phase.icon;
          const isActive = currentPhase === phase.id;
          const isPast = phases.findIndex(p => p.id === currentPhase) > index;
          const isNext = phases.findIndex(p => p.id === currentPhase) === index - 1;

          return (
            <div key={phase.id} className="flex-1">
              <Button
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                onClick={() => onPhaseChange(phase.id)}
                disabled={isLoading || currentPhase === 'concluded'}
                className="w-full gap-2 relative"
              >
                <Icon className="h-4 w-4" />
                {phase.label}
                {isPast && <CheckCircle className="h-3 w-3 absolute top-1 right-1" />}
                {isNext && currentPhase !== 'concluded' && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-1 px-1">
                {phase.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
