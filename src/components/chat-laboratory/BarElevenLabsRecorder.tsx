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
  activeAgentId?: string; // Agent ID dall'orchestratore/settings
}

export const BarElevenLabsRecorder = ({
  conversationId,
  onTranscriptionComplete,
  isDisabled = false,
  isAISpeaking = false,
  activeAgentId
}: BarElevenLabsRecorderProps) => {
  const [isActive, setIsActive] = useState(false);

  // Hook per gestire widget Bar dedicato - usa activeAgentId da props
  useBarVoiceWidget(isActive, activeAgentId || null);

  const toggleWidget = () => {
    if (!activeAgentId) {
      toast.error("Agent ID mancante", {
        description: "Configura un Bar Agent nelle impostazioni"
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
        disabled={isDisabled || !activeAgentId}
        className={cn(
          "h-12 px-6 gap-2 transition-all",
          isActive && "animate-pulse"
        )}
        title={!activeAgentId ? "Configura Bar Agent nelle impostazioni" : ""}
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
      {!activeAgentId && (
        <span className="text-xs text-yellow-600">
          ⚠️ Bar Agent non configurato
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
