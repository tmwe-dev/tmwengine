import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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

    const widget = document.querySelector('elevenlabs-convai') as HTMLElement;
    
    if (isActive) {
      // Nascondi widget
      if (widget) {
        widget.style.display = 'none';
      }
      setIsActive(false);
      console.log('📴 Widget ElevenLabs nascosto');
    } else {
      // Mostra widget (se non esiste, viene creato da useElevenLabsWidget)
      if (widget) {
        widget.style.display = 'block';
        setIsActive(true);
        console.log('🎙️ Widget ElevenLabs attivato');
      } else {
        // Trigger mount del widget
        const config = {
          agentId: agentId,
          enabled: true
        };
        localStorage.setItem('voice_agent_config', JSON.stringify(config));
        
        // Dispatch evento custom per triggerare reload immediato
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'voice_agent_config',
          newValue: JSON.stringify(config)
        }));
        
        toast.info("Attivazione widget...", {
          description: "Il widget vocale si sta caricando"
        });
        
        // Verifica dopo 2 secondi se il widget è stato montato
        setTimeout(() => {
          const widgetCheck = document.querySelector('elevenlabs-convai') as HTMLElement;
          if (widgetCheck) {
            widgetCheck.style.display = 'block';
            setIsActive(true);
            toast.success("Widget pronto!", {
              description: "Puoi iniziare a parlare"
            });
          } else {
            toast.error("Errore caricamento", {
              description: "Il widget non si è caricato correttamente"
            });
            setIsActive(false);
          }
        }, 2000);
        
        return;
      }
    }
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

      {/* Nota: il widget ElevenLabs viene già montato da useElevenLabsWidget */}
      {isActive && (
        <span className="text-xs text-muted-foreground">
          Il widget vocale è attivo nella pagina
        </span>
      )}
    </div>
  );
};
