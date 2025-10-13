import { useState, useEffect } from 'react';
import { useConversation } from '@11labs/react';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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

  // Carica Agent ID da localStorage
  useEffect(() => {
    const config = localStorage.getItem('elevenlabs_config');
    if (config) {
      try {
        const parsed = JSON.parse(config);
        setAgentId(parsed.agentId);
      } catch (error) {
        console.error('Errore parsing ElevenLabs config:', error);
      }
    }
  }, []);

  const conversation = useConversation({
    onConnect: () => {
      console.log('🎙️ ElevenLabs connesso');
      toast.success("Conversazione attiva", {
        description: "Parla liberamente con l'AI"
      });
    },
    onDisconnect: () => {
      console.log('📴 ElevenLabs disconnesso');
      setIsActive(false);
    },
    onMessage: (message) => {
      console.log('📨 Messaggio ElevenLabs:', message);
      
      // Intercetta trascrizioni utente (source = 'user')
      if (message.source === 'user' && message.message) {
        console.log('🎯 Trascrizione utente:', message.message);
        onTranscriptionComplete(message.message);
      }
    },
    onError: (error) => {
      console.error('❌ Errore ElevenLabs:', error);
      toast.error("Errore connessione", {
        description: typeof error === 'string' ? error : "Impossibile connettersi"
      });
      setIsActive(false);
    }
  });

  const toggleConversation = async () => {
    if (!agentId) {
      toast.error("Agent ID mancante", {
        description: "Configura ElevenLabs in localStorage"
      });
      return;
    }

    if (isActive) {
      // Stop conversazione
      await conversation.endSession();
      setIsActive(false);
    } else {
      // Start conversazione
      try {
        // Richiedi permesso microfono
        await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Ottieni signed URL tramite edge function
        const { data, error } = await supabase.functions.invoke('elevenlabs-signed-url', {
          body: { agentId }
        });

        if (error) throw error;
        if (!data?.signedUrl) throw new Error('No signed URL returned');

        console.log('🔐 Signed URL ottenuto');
        
        // Avvia sessione con signed URL
        const sessionId = await conversation.startSession({
          signedUrl: data.signedUrl
        });
        
        console.log('✅ Sessione ElevenLabs avviata:', sessionId);
        setIsActive(true);
      } catch (error) {
        console.error('Errore avvio conversazione:', error);
        toast.error("Errore avvio", {
          description: error instanceof Error ? error.message : "Impossibile avviare"
        });
      }
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={isActive ? "destructive" : "default"}
        size="lg"
        onClick={toggleConversation}
        disabled={isDisabled || !agentId}
        className={cn(
          "h-12 px-6 gap-2 transition-all",
          isActive && "animate-pulse"
        )}
        title={!agentId ? "Configura Agent ID in localStorage" : ""}
      >
        {isActive ? (
          <>
            <PhoneOff className="h-5 w-5" />
            <span>Termina Chiamata</span>
          </>
        ) : (
          <>
            <Phone className="h-5 w-5" />
            <span>Avvia Conversazione</span>
          </>
        )}
      </Button>

      {/* Status Indicator */}
      {isActive && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span>{conversation.isSpeaking ? "🔊 AI parla..." : "👂 In ascolto..."}</span>
        </div>
      )}

      {/* Config warning */}
      {!agentId && (
        <span className="text-xs text-yellow-600">
          ⚠️ Agent ID non configurato
        </span>
      )}
    </div>
  );
};
