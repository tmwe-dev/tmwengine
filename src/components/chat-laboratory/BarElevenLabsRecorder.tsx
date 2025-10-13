import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useBarVoiceWidget } from '@/hooks/useBarVoiceWidget';

interface BarElevenLabsRecorderProps {
  conversationId: string | null;
  onTranscriptionComplete: (text: string) => void;
  isDisabled?: boolean;
  isAISpeaking?: boolean;
}

export const BarElevenLabsRecorder = ({
  conversationId,
  onTranscriptionComplete,
  isDisabled = false,
  isAISpeaking = false
}: BarElevenLabsRecorderProps) => {
  const [isActive, setIsActive] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(null);

  // Hook per gestire widget Bar dedicato
  useBarVoiceWidget(isActive, agentId);

  // Carica Agent ID da voice_agent_config in localStorage
  useEffect(() => {
    const config = localStorage.getItem('voice_agent_config');
    if (config) {
      try {
        const parsed = JSON.parse(config);
        if (parsed.agentId) {
          setAgentId(parsed.agentId);
        }
      } catch (error) {
        console.error('Errore parsing voice_agent_config:', error);
      }
    }
  }, []);

  const toggleWidget = () => {
    if (!agentId) {
      toast.error("Agent ID mancante", {
        description: "Configura ElevenLabs nelle impostazioni"
      });
      return;
    }

    // Toggle stato - il widget viene gestito da useBarVoiceWidget
    setIsActive(!isActive);
    console.log(isActive ? '📴 Widget Bar terminato' : '🎙️ Widget Bar avviato');
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={isActive ? "destructive" : "default"}
        size="lg"
        onClick={toggleWidget}
        disabled={isDisabled || !agentId}
        className={cn(
          "h-12 px-6 gap-2 transition-all",
          isActive && "animate-pulse"
        )}
        title={!agentId ? "Configura Agent ID nelle impostazioni" : ""}
      >
        {isActive ? (
          <>
            <PhoneOff className="h-5 w-5" />
            <span>Termina Conversazione</span>
          </>
        ) : (
          <>
            <Phone className="h-5 w-5" />
            <span>Avvia Conversazione</span>
          </>
        )}
      </Button>

      {/* Config warning */}
      {!agentId && (
        <span className="text-xs text-yellow-600">
          ⚠️ Agent ID non configurato
        </span>
      )}

      {/* Widget Bar Mode gestito da useBarVoiceWidget */}
      {isActive && (
        <span className="text-xs text-muted-foreground">
          Widget Bar Mode attivo
        </span>
      )}
    </div>
  );
};
