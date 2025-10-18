import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Mic, Headphones } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { InteractiveMicrophoneButton } from './InteractiveMicrophoneButton';
import { AudioSettingsPopup } from './AudioSettingsPopup';
import { BarVoiceRecorder } from './BarVoiceRecorder';
import { BarVoiceRecorderV2_Hybrid } from './BarVoiceRecorderV2_Hybrid';

export type AudioMode = 'stable' | 'v2_hybrid';

interface AudioModeSelectorProps {
  conversationId: string | null;
  onModeChange?: (mode: AudioMode) => void;
  onTranscriptionComplete: (text: string) => void;
  isAISpeaking: boolean;
  showOnlyButtons?: boolean;
  showOnlyRecorder?: boolean;
  audioMode?: AudioMode;
}

export const AudioModeSelector = ({ conversationId, onModeChange, onTranscriptionComplete, isAISpeaking, showOnlyButtons = false, showOnlyRecorder = false, audioMode: externalAudioMode }: AudioModeSelectorProps) => {
  const [selectedMode, setSelectedMode] = useState<AudioMode>('stable');
  const [vadTimeout, setVadTimeout] = useState<number>(2); // Default 2 seconds
  const isMobile = useIsMobile();

  useEffect(() => {
    if (externalAudioMode !== undefined) {
      setSelectedMode(externalAudioMode);
    }
  }, [externalAudioMode]);

  const updateAudioMode = async (mode: AudioMode) => {
    setSelectedMode(mode);
    onModeChange?.(mode);
  };

  const modes = [
    { 
      id: 'stable' as const,
      number: 1 as const,
      label: 'PTT', 
      icon: Mic,
      description: 'Push-to-talk con VAD configurabile',
      disabled: false
    },
    { 
      id: 'v2_hybrid' as const,
      number: 2 as const,
      label: 'Listen', 
      icon: Headphones,
      description: 'Coming Soon - Modalità ascolto continuo',
      disabled: true
    },
  ];

  // Mostra solo i bottoni (senza microfono)
  if (showOnlyButtons) {
    return (
      <div className="flex items-center gap-1.5">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isSelected = selectedMode === mode.id;
          
          return (
            <Button
              key={mode.id}
              onClick={() => updateAudioMode(mode.id)}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-12 px-2 cursor-pointer",
                isMobile ? "w-10" : "min-w-[4.5rem]",
                isSelected 
                  ? "bg-primary text-primary-foreground border-primary" 
                  : "bg-white/5 text-white/80 border-white/20 hover:bg-white/10 hover:text-white"
              )}
              title={mode.description}
            >
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[10px] font-bold opacity-60">{mode.number}</span>
                <div className="flex items-center gap-1">
                  <Icon className="h-4 w-4" />
                  {!isMobile && <span className="text-xs font-medium">{mode.label}</span>}
                </div>
              </div>
            </Button>
          );
        })}
      </div>
    );
  }

  // Mostra solo il microfono attivo (senza bottoni)
  if (showOnlyRecorder && conversationId) {
    return (
      <div className="w-full flex flex-col items-center gap-2">
        {selectedMode === 'stable' && (
          <>
            <BarVoiceRecorder
              conversationId={conversationId}
              onTranscriptionComplete={onTranscriptionComplete}
              isDisabled={isAISpeaking}
              vadTimeout={vadTimeout}
            />
            <div className="flex items-center gap-2 w-32">
              <span className="text-xs text-muted-foreground">{vadTimeout}s</span>
              <Slider
                value={[vadTimeout]}
                onValueChange={(values) => setVadTimeout(values[0])}
                min={1}
                max={5}
                step={0.5}
                className="flex-1"
              />
            </div>
          </>
        )}
        
        {selectedMode === 'v2_hybrid' && (
          <BarVoiceRecorderV2_Hybrid
            conversationId={conversationId}
            onTranscriptionComplete={onTranscriptionComplete}
            isDisabled={isAISpeaking}
          />
        )}
      </div>
    );
  }

  // Layout completo (default): bottoni con microfono integrato direttamente
  return (
    <div className="flex items-center gap-2">
      {/* Tasti interattivi 1 e 2 con microfono integrato */}
      {modes.map((mode) => (
        <InteractiveMicrophoneButton
          key={mode.id}
          mode={mode.id === 'stable' ? 'ptt' : 'hybrid'}
          number={mode.number}
          label={mode.label}
          icon={mode.icon}
          conversationId={conversationId}
          onTranscriptionComplete={onTranscriptionComplete}
          isDisabled={mode.disabled || isAISpeaking}
          isSelected={selectedMode === mode.id}
          onSelect={() => updateAudioMode(mode.id)}
          vadTimeout={mode.id === 'stable' ? vadTimeout : undefined}
          description={mode.description}
        />
      ))}
      
      {/* VAD Slider + Settings - solo per PTT selezionato */}
      {selectedMode === 'stable' && (
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1 w-24">
            <span className="text-xs text-muted-foreground">{vadTimeout}s</span>
            <Slider
              value={[vadTimeout]}
              onValueChange={(values) => setVadTimeout(values[0])}
              min={1}
              max={5}
              step={0.5}
              className="flex-1"
            />
          </div>
          <AudioSettingsPopup conversationId={conversationId} />
        </div>
      )}
    </div>
  );
};
