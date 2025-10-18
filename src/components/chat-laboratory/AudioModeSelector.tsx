import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Radio, Clock, Headphones } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { BarVoiceRecorder } from './BarVoiceRecorder';
import { BarVoiceRecorderV2_Continuous } from './BarVoiceRecorderV2_Continuous';
import { BarVoiceRecorderV2_Extended } from './BarVoiceRecorderV2_Extended';
import { BarVoiceRecorderV2_Hybrid } from './BarVoiceRecorderV2_Hybrid';

export type AudioMode = 'stable' | 'v2_continuous' | 'v2_extended' | 'v2_hybrid';

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
      number: 1,
      label: 'PTT 3s', 
      icon: Mic,
      description: 'Push-to-talk con stop automatico a 3s di silenzio'
    },
    { 
      id: 'v2_continuous' as const,
      number: 2,
      label: 'Live 1.5s', 
      icon: Radio,
      description: 'Conversazione continua con stop a 1.5s di silenzio'
    },
    { 
      id: 'v2_extended' as const,
      number: 3,
      label: 'Hold', 
      icon: Clock,
      description: 'Press & Hold - stop automatico al rilascio'
    },
    { 
      id: 'v2_hybrid' as const,
      number: 4,
      label: 'Listen', 
      icon: Headphones,
      description: 'Modalità ibrida con ascolto attivo'
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
      <div className="w-full flex justify-center">
        {selectedMode === 'stable' && (
          <BarVoiceRecorder
            conversationId={conversationId}
            onTranscriptionComplete={onTranscriptionComplete}
            isDisabled={isAISpeaking}
          />
        )}
        
        {selectedMode === 'v2_continuous' && (
          <BarVoiceRecorderV2_Continuous
            conversationId={conversationId}
            onTranscriptionComplete={onTranscriptionComplete}
            isDisabled={isAISpeaking}
          />
        )}
        
        {selectedMode === 'v2_extended' && (
          <BarVoiceRecorderV2_Extended
            conversationId={conversationId}
            onTranscriptionComplete={onTranscriptionComplete}
            isDisabled={isAISpeaking}
          />
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

  // Layout completo (default): bottoni + microfono
  return (
    <div className="flex items-center gap-3">
      {/* Bottoni Selezione Modalità */}
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
                "h-12 w-10 p-0 cursor-pointer",
                isSelected 
                  ? "bg-primary text-primary-foreground border-primary" 
                  : "bg-white/5 text-white/80 border-white/20 hover:bg-white/10 hover:text-white"
              )}
              title={mode.description}
            >
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[10px] font-bold opacity-60">{mode.number}</span>
                <Icon className="h-4 w-4" />
              </div>
            </Button>
          );
        })}
      </div>

      {/* Microfono Attivo a destra */}
      {conversationId && (
        <div className="flex-1 flex justify-end">
          {selectedMode === 'stable' && (
            <BarVoiceRecorder
              conversationId={conversationId}
              onTranscriptionComplete={onTranscriptionComplete}
              isDisabled={isAISpeaking}
            />
          )}
          
          {selectedMode === 'v2_continuous' && (
            <BarVoiceRecorderV2_Continuous
              conversationId={conversationId}
              onTranscriptionComplete={onTranscriptionComplete}
              isDisabled={isAISpeaking}
            />
          )}
          
          {selectedMode === 'v2_extended' && (
            <BarVoiceRecorderV2_Extended
              conversationId={conversationId}
              onTranscriptionComplete={onTranscriptionComplete}
              isDisabled={isAISpeaking}
            />
          )}
          
          {selectedMode === 'v2_hybrid' && (
            <BarVoiceRecorderV2_Hybrid
              conversationId={conversationId}
              onTranscriptionComplete={onTranscriptionComplete}
              isDisabled={isAISpeaking}
            />
          )}
        </div>
      )}
    </div>
  );
};
