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
import { useRadioAudioPlayer } from '@/contexts/RadioAudioPlayerContext';

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
  const { isPlayerExpanded } = useRadioAudioPlayer();

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
    <div className={cn(
      "fixed bottom-8 z-[60]",
      "w-[45%] max-w-2xl",
      "bg-black/95 backdrop-blur-lg",
      "border-2 border-purple-400/40",
      "rounded-xl shadow-[0_0_30px_rgba(168,85,247,0.25)]",
      "h-[56px] px-3 py-2",
      "flex items-center gap-2",
      "relative overflow-hidden",
      "transition-all duration-300",
      isPlayerExpanded 
        ? "left-[calc(27.5%+45%+0.5rem)]"
        : "left-[calc(27.5%+96px+0.5rem)]"
    )}>
      
      {/* Gradient overlay solo lilla */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-purple-500/5 pointer-events-none" />
      
      {/* Contenuto orizzontale */}
      <div className="relative z-10 flex items-center gap-2">
        
        {/* Mode selector compatto */}
        <div className="flex items-center gap-1">
          {modes.map((mode) => {
            const Icon = mode.icon;
            const isSelected = audioMode === mode.id;
            
            return (
              <button
                key={mode.id}
                onClick={() => handleModeChange(mode.id)}
                className={cn(
                  "w-10 h-10 rounded-md flex items-center justify-center transition-all",
                  isSelected 
                    ? "bg-purple-500/30 border border-purple-400/50 text-purple-300" 
                    : "bg-purple-500/10 border border-purple-400/20 text-purple-400 hover:bg-purple-500/20"
                )}
                title={mode.description}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>
        
        {/* Separatore */}
        <div className="h-6 w-px bg-purple-400/30" />
        
        {/* VAD Slider compatto (solo se stable mode) */}
        {audioMode === 'stable' && (
          <>
            <div className="flex items-center gap-1.5 min-w-[100px]">
              <span className="text-[10px] text-purple-400 whitespace-nowrap">VAD</span>
              <Slider 
                value={[vadTimeout]} 
                onValueChange={([val]) => setVadTimeout(val)} 
                min={1} 
                max={5} 
                step={0.5} 
                className="flex-1" 
              />
              <span className="text-[10px] text-purple-300 w-6 text-center">{vadTimeout}s</span>
            </div>
            <div className="h-6 w-px bg-purple-400/30" />
          </>
        )}
        
        {/* Response limit slider compatto */}
        <div className="flex items-center gap-1.5 min-w-[100px]">
          <span className="text-[10px] text-purple-400 whitespace-nowrap">Max</span>
          <RadioWordLimitSlider
            conversationId={conversationId}
            value={maxWords}
            onChange={setMaxWords}
          />
        </div>
        
        {/* Separatore */}
        <div className="h-6 w-px bg-purple-400/30" />
        
        {/* Voice recorder button */}
        <div className="flex-shrink-0">
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
        
        {/* Close button */}
        <button 
          onClick={onClose}
          className="w-10 h-10 rounded-md bg-purple-500/10 hover:bg-purple-500/20 flex items-center justify-center transition-all"
        >
          <X className="w-4 h-4 text-purple-400" />
        </button>
      </div>
    </div>
  );
};
