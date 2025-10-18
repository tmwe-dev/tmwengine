import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Radio, Clock, Headphones } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

const AUDIO_MODE_STORAGE_KEY = 'global-audio-mode';

export type AudioMode = 'stable' | 'v2_continuous' | 'v2_extended' | 'v2_hybrid';

interface AudioModeButtonsProps {
  onModeChange?: (mode: AudioMode) => void;
}

export const AudioModeButtons = ({ onModeChange }: AudioModeButtonsProps) => {
  const [selectedMode, setSelectedMode] = useState<AudioMode>('stable');
  const isMobile = useIsMobile();

  useEffect(() => {
    // Carica la modalità salvata globalmente
    const stored = localStorage.getItem(AUDIO_MODE_STORAGE_KEY);
    if (stored) {
      setSelectedMode(stored as AudioMode);
    }
  }, []);

  const updateAudioMode = (mode: AudioMode) => {
    // Salva in localStorage globale (non legato a conversationId)
    localStorage.setItem(AUDIO_MODE_STORAGE_KEY, mode);
    setSelectedMode(mode);
    onModeChange?.(mode);
    
    const modeNames = {
      stable: 'PTT 3s',
      v2_continuous: 'Live 1.5s',
      v2_extended: 'Hold',
      v2_hybrid: 'Listen'
    };
    
    toast.success(`Modalità: ${modeNames[mode]}`);
  };

  const modes = [
    { 
      id: 'stable' as const,
      number: 1,
      label: 'PTT', 
      icon: Mic,
      description: 'Push-to-talk con stop automatico a 3s'
    },
    { 
      id: 'v2_continuous' as const,
      number: 2,
      label: 'Live', 
      icon: Radio,
      description: 'Conversazione continua (1.5s silenzio)'
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
              "h-12 px-2 cursor-pointer transition-all",
              isMobile ? "w-10" : "min-w-[4.5rem]",
              isSelected 
                ? "bg-primary text-primary-foreground border-primary" 
                : "bg-card/40 border-border/40 hover:bg-card hover:border-border"
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
};
