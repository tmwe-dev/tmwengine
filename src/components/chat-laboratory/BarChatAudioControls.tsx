import { useState, useEffect } from 'react';
import { BarVoiceRecorder } from './BarVoiceRecorder';
import { BarElevenLabsRecorder } from './BarElevenLabsRecorder';
import { InterruptButton } from './InterruptButton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Mic, Users, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BarChatAudioControlsProps {
  conversationId: string | null;
  isAISpeaking: boolean;
  onTranscriptionComplete: (text: string) => void;
  onInterrupt: () => void;
  className?: string;
}

export const BarChatAudioControls = ({
  conversationId,
  isAISpeaking,
  onTranscriptionComplete,
  onInterrupt,
  className
}: BarChatAudioControlsProps) => {
  const [isDuplexMode, setIsDuplexMode] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeBarAgent, setActiveBarAgent] = useState<string | null>(null);

  useEffect(() => {
    if (conversationId) {
      loadPauseState();
    }
  }, [conversationId]);

  // Carica l'agent attivo da elevenlabs_agents
  useEffect(() => {
    const loadActiveBarAgent = async () => {
      try {
        const { data, error } = await supabase
          .from('elevenlabs_agents')
          .select('elevenlabs_agent_id')
          .eq('is_active', true)
          .order('order_index', { ascending: true })
          .limit(1)
          .single();

        if (data && !error) {
          setActiveBarAgent(data.elevenlabs_agent_id);
          console.log('🎙️ Bar Agent attivo caricato:', data.elevenlabs_agent_id);
        } else {
          console.warn('⚠️ Nessun Bar Agent attivo trovato');
        }
      } catch (error) {
        console.error('Error loading active Bar Agent:', error);
      }
    };

    loadActiveBarAgent();
  }, []);

  const loadPauseState = async () => {
    if (!conversationId) return;

    try {
      const { data, error } = await supabase
        .from('chat_laboratory_conversations')
        .select('is_paused')
        .eq('id', conversationId)
        .single();

      if (error) throw error;
      setIsPaused(data?.is_paused || false);
    } catch (error) {
      console.error('Error loading pause state:', error);
    }
  };

  const togglePause = async () => {
    if (!conversationId) return;
    
    const newPauseState = !isPaused;
    
    try {
      const { error } = await supabase
        .from('chat_laboratory_conversations')
        .update({ is_paused: newPauseState })
        .eq('id', conversationId);
      
      if (error) throw error;
      
      setIsPaused(newPauseState);
      
      toast[newPauseState ? 'warning' : 'success'](
        newPauseState ? "⏸️ Conversazione in Pausa" : "▶️ Conversazione Ripresa",
        {
          description: newPauseState 
            ? "L'AI non risponderà fino alla ripresa" 
            : "L'AI può nuovamente rispondere"
        }
      );
    } catch (error) {
      console.error('Error toggling pause:', error);
      toast.error("Errore", {
        description: "Impossibile cambiare stato pausa"
      });
    }
  };

  return (
    <div className={cn(
      "border-t border-border/40 backdrop-blur-xl bg-background/80",
      "p-6 rounded-lg shadow-lg",
      className
    )}>
      {/* Tutti i controlli sulla stessa linea */}
      <div className="flex justify-start items-center gap-4">
        {/* Switch modalità */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 sm:hidden text-muted-foreground" />
            <Label 
              htmlFor="duplex-mode" 
              className={cn(
                "text-sm font-medium cursor-pointer transition-colors hidden sm:inline",
                !isDuplexMode ? "text-foreground" : "text-muted-foreground"
              )}
              title="Premi per parlare, rilascia per inviare"
            >
              🎤 Manuale
            </Label>
          </div>
          <Switch
            id="duplex-mode"
            checked={isDuplexMode}
            onCheckedChange={setIsDuplexMode}
          />
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 sm:hidden text-muted-foreground" />
            <Label 
              htmlFor="duplex-mode" 
              className={cn(
                "text-sm font-medium cursor-pointer transition-colors hidden sm:inline",
                isDuplexMode ? "text-foreground" : "text-muted-foreground"
              )}
              title="Parla liberamente come in una telefonata"
            >
              📞 Conversazione Continua
            </Label>
          </div>
        </div>

        {/* Recorder (PTT o ElevenLabs Full-Duplex) */}
        {isDuplexMode ? (
          <BarElevenLabsRecorder
            conversationId={conversationId}
            onTranscriptionComplete={(text) => {
              console.log('🎯 [BarChatAudioControls] Trascrizione ricevuta da ElevenLabs:', text);
              onTranscriptionComplete(text);
            }}
            isDisabled={false}
            isAISpeaking={isAISpeaking}
            activeAgentId={activeBarAgent || undefined}
          />
        ) : (
          <BarVoiceRecorder
            conversationId={conversationId}
            onTranscriptionComplete={onTranscriptionComplete}
            isDisabled={isAISpeaking}
          />
        )}

        {/* Pause/Resume Button - senza bordo */}
        <Button
          variant={isPaused ? "default" : "ghost"}
          size="icon"
          onClick={togglePause}
          className={cn(
            "h-12 w-12 rounded-full transition-all",
            isPaused && "bg-yellow-500 hover:bg-yellow-600 text-white"
          )}
          title={isPaused ? "Riprendi conversazione" : "Pausa conversazione"}
        >
          {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
        </Button>

        {/* Interrupt Button - visibile solo quando AI parla */}
        <InterruptButton
          isAISpeaking={isAISpeaking}
          onInterrupt={onInterrupt}
        />
      </div>

    </div>
  );
};
