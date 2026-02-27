import { useState, useEffect } from 'react';
import { InteractiveMicrophoneButton } from '@/components/chat-laboratory/InteractiveMicrophoneButton';
import { RadioWordLimitSlider } from './RadioWordLimitSlider';
import { Slider } from '@/components/ui/slider';
import { X, Mic, Headphones, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useRadioAudioPlayer } from '@/contexts/RadioAudioPlayerContext';

type AudioMode = 'stable' | 'v2_hybrid';

interface RadioAudioControlsProps {
  conversationId: string | null;
  onClose: () => void;
  onSendMessage?: (text: string) => void;
  participants?: Array<{
    id: string;
    type: string;
    name: string;
    is_active: boolean;
    voice_id?: string;
  }>;
  cachedPrompts?: any;
}

export const RadioAudioControls = ({
  conversationId,
  onClose,
  onSendMessage,
  participants = [],
  cachedPrompts
}: RadioAudioControlsProps) => {
  const [audioMode, setAudioMode] = useState<AudioMode>('stable');
  const [vadTimeout, setVadTimeout] = useState<number>(2);
  const [maxWords, setMaxWords] = useState<number>(80);
  const [isPaused, setIsPaused] = useState(false);
  const [micStatus, setMicStatus] = useState<{ 
    isActive: boolean; 
    audioLevel: number; 
    silenceCountdown: number 
  }>({ isActive: false, audioLevel: 0, silenceCountdown: 0 });
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

  // ✅ Simplified: delegate to parent's sendMessage or fallback to textarea injection
  const handleTranscription = async (text: string) => {
    if (!conversationId) return;

    // Check if textarea is focused → inject text
    const textareaElement = document.querySelector('textarea') as HTMLTextAreaElement;
    const isTextareaFocused = document.activeElement === textareaElement;

    if (isTextareaFocused && textareaElement) {
      const currentValue = textareaElement.value;
      textareaElement.value = currentValue + text;
      const event = new Event('input', { bubbles: true });
      textareaElement.dispatchEvent(event);
      toast.success('Trascrizione inserita nel campo');
    } else if (onSendMessage) {
      // ✅ Delegate to parent's sendMessage (no duplication)
      onSendMessage(text);
      toast.success('Messaggio vocale inviato agli agenti');
    } else {
      toast.error('Nessun handler disponibile per inviare il messaggio');
    }
  };

  const handleModeChange = (mode: AudioMode) => {
    setAudioMode(mode);
    localStorage.setItem('radio-audio-mode', mode);
  };

  const modes = [
    { 
      id: 'stable' as const,
      number: 1 as const,
      label: 'PTT', 
      icon: Mic,
      description: 'Push-to-talk con VAD configurabile',
    },
    { 
      id: 'v2_hybrid' as const,
      number: 2 as const,
      label: 'Listen', 
      icon: Headphones,
      description: 'Modalità ascolto continuo',
    },
  ];

  return (
    <div className={cn(
      "w-full max-w-3xl",
      "bg-black/95 backdrop-blur-lg",
      "border-2 border-purple-400/40",
      "rounded-xl shadow-[0_0_30px_rgba(168,85,247,0.25)]",
      "px-3 py-2",
      "flex flex-col gap-2",
      "relative overflow-hidden",
      "transition-all duration-300"
    )}>
      
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-purple-500/5 pointer-events-none" />
      
      {/* Volume bar e countdown */}
      {micStatus.isActive && (
        <div className="relative z-10 flex items-center gap-2 px-2 py-1 bg-purple-500/20 rounded-md border border-purple-400/40 animate-fade-in">
          <Volume2 className="h-3 w-3 text-purple-300" />
          <div className="flex-1 h-1.5 bg-purple-900/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-400 to-pink-400 transition-all"
              style={{ width: `${micStatus.audioLevel * 100}%` }}
            />
          </div>
          {micStatus.silenceCountdown > 0 && (
            <span className="text-xs text-purple-300 font-medium">
              Invio tra {micStatus.silenceCountdown}s...
            </span>
          )}
        </div>
      )}
      
      {/* Main horizontal content */}
      <div className="relative z-10 flex items-center gap-2">
        
        {/* Interactive microphones */}
        <div className="flex items-center gap-1.5">
          {modes.map((mode) => (
            <InteractiveMicrophoneButton
              key={mode.id}
              mode={mode.id === 'stable' ? 'ptt' : 'hybrid'}
              number={mode.number}
              label={mode.label}
              icon={mode.icon}
              conversationId={conversationId}
              onTranscriptionComplete={handleTranscription}
              isDisabled={isPaused}
              isSelected={audioMode === mode.id}
              onSelect={() => handleModeChange(mode.id)}
              vadTimeout={mode.id === 'stable' ? vadTimeout : undefined}
              description={mode.description}
              onStatusChange={setMicStatus}
            />
          ))}
        </div>
        
        <div className="h-6 w-px bg-purple-400/30" />
        
        {/* VAD Slider (PTT only) */}
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
        
        {/* Max Words Slider */}
        <div className="flex items-center gap-1.5 min-w-[100px]">
          <span className="text-[10px] text-purple-400 whitespace-nowrap">Max</span>
          <RadioWordLimitSlider
            conversationId={conversationId}
            value={maxWords}
            onChange={setMaxWords}
          />
        </div>
        
        <div className="h-6 w-px bg-purple-400/30" />
        
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
