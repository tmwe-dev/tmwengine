import { useState, useEffect } from 'react';
import { RadioVoiceRecorder } from './RadioVoiceRecorder';
import { RadioVoiceRecorderV2_Hybrid } from './RadioVoiceRecorderV2_Hybrid';
import { RadioAudioSettingsPopup } from './RadioAudioSettingsPopup';
import { RadioWordLimitSlider } from './RadioWordLimitSlider';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { X, Mic, Headphones } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type AudioMode = 'stable' | 'v2_hybrid';

interface RadioAudioControlsProps {
  conversationId: string | null;
  onClose: () => void;
}

export const RadioAudioControls = ({
  conversationId,
  onClose,
}: RadioAudioControlsProps) => {
  const [audioMode, setAudioMode] = useState<AudioMode>('stable');
  const [vadTimeout, setVadTimeout] = useState<number>(2);
  const [maxWords, setMaxWords] = useState<number>(80);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (conversationId) {
      loadAudioMode();
      loadPauseState();
      loadMaxWords();
    }
  }, [conversationId]);

  const loadAudioMode = () => {
    const stored = localStorage.getItem('radio-audio-mode');
    if (stored) {
      setAudioMode(stored as AudioMode);
    }
  };

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

  const loadMaxWords = async () => {
    try {
      const { data, error } = await supabase
        .from('elevenlabs_agents')
        .select('max_words_per_response')
        .limit(1)
        .single();

      if (error) throw error;
      if (data) {
        setMaxWords(data.max_words_per_response || 80);
      }
    } catch (error) {
      console.error('Error loading max words:', error);
    }
  };

  const handleTranscription = async (text: string) => {
    if (!conversationId) return;

    // 🔍 CONTROLLO: il campo testo è attivo?
    const textareaElement = document.querySelector('textarea') as HTMLTextAreaElement;
    const isTextareaFocused = document.activeElement === textareaElement;

    if (isTextareaFocused && textareaElement) {
      // SCENARIO 1: Inserisco nel campo esistente
      const currentValue = textareaElement.value;
      textareaElement.value = currentValue + text;
      
      // Trigger evento change per React
      const event = new Event('input', { bubbles: true });
      textareaElement.dispatchEvent(event);
      
      toast.success('Trascrizione inserita nel campo');
    } else {
      // SCENARIO 2: Invio diretto DB + orchestrator
      const { error: insertError } = await supabase
        .from('chat_laboratory_messages')
        .insert({
          conversation_id: conversationId,
          sender_type: 'human',
          sender_name: 'Human',
          content: text,
          created_at: new Date().toISOString()
        });

      if (insertError) {
        toast.error('Errore invio messaggio vocale');
        return;
      }

      const { error: orchError } = await supabase.functions.invoke(
        'radio-chat-orchestrator',
        {
          body: {
            conversationId,
            userMessage: text,
            triggeredBy: 'voice'
          }
        }
      );

      if (orchError) {
        toast.error('Errore elaborazione risposta');
      } else {
        toast.success('Messaggio vocale inviato agli agenti');
      }
    }
  };

  const handleModeChange = (mode: AudioMode) => {
    setAudioMode(mode);
    localStorage.setItem('radio-audio-mode', mode);
  };

  const modes = [
    { 
      id: 'stable' as const,
      label: 'PTT', 
      icon: Mic,
      description: 'Push-to-talk con VAD configurabile',
    },
    { 
      id: 'v2_hybrid' as const,
      label: 'Listen', 
      icon: Headphones,
      description: 'Modalità ascolto continuo',
    },
  ];

  return (
    <div className="fixed bottom-24 left-4 z-50 
                    bg-black/95 backdrop-blur-lg 
                    border-2 border-purple-400/40 
                    rounded-xl shadow-[0_0_30px_rgba(168,85,247,0.25)]
                    p-4 min-w-[320px] max-w-[400px]
                    relative overflow-hidden">
      
      {/* Gradient overlay simile alle card */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-cyan-500/10 pointer-events-none" />
      
      {/* Contenuto con z-index relativo */}
      <div className="relative z-10">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Audio Controls</h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Microphone Mode Selector */}
      <div className="flex items-center gap-2 mb-3">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isSelected = audioMode === mode.id;
          
          return (
            <Button
              key={mode.id}
              onClick={() => handleModeChange(mode.id)}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              className={cn(
                "flex-1 h-12",
                isSelected 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-card/40 border-border/40"
              )}
              title={mode.description}
            >
              <div className="flex flex-col items-center gap-0.5">
                <Icon className="h-4 w-4" />
                <span className="text-xs font-medium">{mode.label}</span>
              </div>
            </Button>
          );
        })}
      </div>

      {/* VAD Slider (solo se PTT attivo) */}
      {audioMode === 'stable' && (
        <div className="flex items-center gap-2 mb-3 p-2 bg-muted/20 rounded-md">
          <Label className="text-xs whitespace-nowrap">VAD:</Label>
          <Slider 
            value={[vadTimeout]} 
            onValueChange={([val]) => setVadTimeout(val)} 
            min={1} 
            max={5} 
            step={0.5} 
            className="flex-1" 
          />
          <span className="text-xs w-8 text-center">{vadTimeout}s</span>
          <RadioAudioSettingsPopup conversationId={conversationId} />
        </div>
      )}

      {/* Response Length */}
      <div className="flex items-center justify-between mb-3 p-2 bg-muted/20 rounded-md">
        <Label className="text-xs">Risposte:</Label>
        <RadioWordLimitSlider
          conversationId={conversationId}
          value={maxWords}
          onChange={setMaxWords}
        />
      </div>

      {/* Actual Voice Recorders (logic only, hidden UI) */}
      <div className="hidden">
        {audioMode === 'stable' && (
          <RadioVoiceRecorder
            conversationId={conversationId}
            onTranscriptionComplete={handleTranscription}
            isDisabled={isPaused}
            vadTimeout={vadTimeout}
          />
        )}
        
        {audioMode === 'v2_hybrid' && conversationId && (
          <RadioVoiceRecorderV2_Hybrid
            conversationId={conversationId}
            onTranscriptionComplete={handleTranscription}
            isDisabled={isPaused}
          />
        )}
      </div>

      {/* Floating Mic Buttons */}
      <div className="flex justify-center gap-2 mt-2">
        {audioMode === 'stable' && (
          <RadioVoiceRecorder
            conversationId={conversationId}
            onTranscriptionComplete={handleTranscription}
            isDisabled={isPaused}
            vadTimeout={vadTimeout}
          />
        )}
        
        {audioMode === 'v2_hybrid' && conversationId && (
          <RadioVoiceRecorderV2_Hybrid
            conversationId={conversationId}
            onTranscriptionComplete={handleTranscription}
            isDisabled={isPaused}
          />
        )}
      </div>
      
      </div> {/* Chiusura contenuto z-10 */}
    </div>
  );
};
