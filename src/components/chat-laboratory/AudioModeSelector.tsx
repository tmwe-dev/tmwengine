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

interface AudioModeSelectorProps {
  conversationId: string | null;
  onModeChange?: (mode: 'stable' | 'v2_continuous' | 'v2_extended' | 'v2_hybrid') => void;
  onTranscriptionComplete: (text: string) => void;
  isAISpeaking: boolean;
}

export const AudioModeSelector = ({ conversationId, onModeChange, onTranscriptionComplete, isAISpeaking }: AudioModeSelectorProps) => {
  const [selectedMode, setSelectedMode] = useState<'stable' | 'v2_continuous' | 'v2_extended' | 'v2_hybrid'>('stable');
  const isMobile = useIsMobile();

  useEffect(() => {
    if (conversationId) {
      loadAudioMode();
    }
  }, [conversationId]);

  const loadAudioMode = async () => {
    if (!conversationId) return;

    try {
      const stored = localStorage.getItem(`audio-mode-${conversationId}`);
      if (stored) {
        setSelectedMode(stored as any);
      }
    } catch (err) {
      console.error('❌ Errore caricamento audio mode:', err);
    }
  };

  const updateAudioMode = async (mode: 'stable' | 'v2_continuous' | 'v2_extended' | 'v2_hybrid') => {
    if (!conversationId) return;

    try {
      localStorage.setItem(`audio-mode-${conversationId}`, mode);
      setSelectedMode(mode);
      onModeChange?.(mode);
      
      const modeNames = {
        stable: 'STABLE (PTT 3s)',
        v2_continuous: 'Continuous (1.5s)',
        v2_extended: 'Extended (Hold)',
        v2_hybrid: 'Hybrid (Listen)'
      };
      
      toast.success(`Modalità audio: ${modeNames[mode]}`);
    } catch (err) {
      console.error('❌ Errore aggiornamento audio mode:', err);
      toast.error('Errore aggiornamento modalità audio');
    }
  };

  const modes = [
    { 
      id: 'stable' as const, 
      label: 'PTT 3s', 
      icon: Mic,
      description: 'Push-to-talk con stop automatico a 3s di silenzio'
    },
    { 
      id: 'v2_continuous' as const, 
      label: 'Live 1.5s', 
      icon: Radio,
      description: 'Conversazione continua con stop a 1.5s di silenzio'
    },
    { 
      id: 'v2_extended' as const, 
      label: 'Hold', 
      icon: Clock,
      description: 'Registrazione estesa, tieni premuto'
    },
    { 
      id: 'v2_hybrid' as const, 
      label: 'Listen', 
      icon: Headphones,
      description: 'Modalità ibrida con ascolto attivo'
    },
  ];

  return (
    <div className="flex flex-col items-center gap-2">
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
                "h-8 px-2",
                isMobile ? "w-8" : "min-w-[4rem]",
                isSelected 
                  ? "bg-primary text-primary-foreground border-primary" 
                  : "bg-white/5 text-white/80 border-white/20 hover:bg-white/10 hover:text-white"
              )}
              title={mode.description}
            >
              <Icon className={cn("h-4 w-4", !isMobile && "mr-1")} />
              {!isMobile && <span className="text-xs font-medium">{mode.label}</span>}
            </Button>
          );
        })}
      </div>

      {/* Microfono Attivo sotto i bottoni */}
      {conversationId && (
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
      )}
    </div>
  );
};
