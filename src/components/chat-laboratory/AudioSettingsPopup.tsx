import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type AudioConfig = 'standard' | 'mac' | 'windows' | 'mobile';

export interface AudioConfigSettings {
  sampleRate: number;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
}

const audioConfigs: Record<AudioConfig, AudioConfigSettings> = {
  standard: {
    sampleRate: 48000,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  mac: {
    sampleRate: 48000,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  windows: {
    sampleRate: 48000,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  mobile: {
    sampleRate: 24000, // Ridotto per ridurre banda
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
};

interface AudioSettingsPopupProps {
  conversationId: string | null;
  onConfigChange?: (config: AudioConfig) => void;
}

export const AudioSettingsPopup = ({ conversationId, onConfigChange }: AudioSettingsPopupProps) => {
  const [selectedConfig, setSelectedConfig] = useState<AudioConfig>('standard');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadAudioConfig();
  }, [conversationId]);

  const loadAudioConfig = async () => {
    // Pre-conversazione: carica da localStorage
    if (!conversationId) {
      const saved = localStorage.getItem('audio-config-pending');
      if (saved) {
        setSelectedConfig(saved as AudioConfig);
      }
      return;
    }

    // Post-conversazione: carica da DB
    try {
      const { data, error } = await supabase
        .from('chat_laboratory_bar_mode')
        .select('audio_config')
        .eq('conversation_id', conversationId)
        .single();

      if (error) throw error;
      if (data?.audio_config) {
        setSelectedConfig(data.audio_config as AudioConfig);
      }
    } catch (error) {
      console.error('Error loading audio config:', error);
    }
  };

  const saveAudioConfig = async (config: AudioConfig) => {
    setSelectedConfig(config);
    onConfigChange?.(config);

    // Pre-conversazione: salva in localStorage
    if (!conversationId) {
      localStorage.setItem('audio-config-pending', config);
      toast.success('Configurazione salvata', {
        description: `Applicherà alla prossima conversazione`
      });
      setIsOpen(false);
      return;
    }

    // Post-conversazione: salva in DB
    try {
      const { error } = await supabase
        .from('chat_laboratory_bar_mode')
        .update({ audio_config: config })
        .eq('conversation_id', conversationId);

      if (error) throw error;
      
      toast.success('Configurazione aggiornata', {
        description: `Ora usando: ${config.toUpperCase()}`
      });
      setIsOpen(false);
    } catch (error) {
      console.error('Error saving audio config:', error);
      toast.error('Errore salvataggio configurazione');
    }
  };

  const configs = [
    {
      id: 'standard' as AudioConfig,
      label: 'Standard',
      description: '48kHz, ottimizzato per qualità',
      icon: '🎯',
    },
    {
      id: 'mac' as AudioConfig,
      label: 'Mac Ottimizzato',
      description: '48kHz, autoGainControl ottimizzato',
      icon: '🍎',
    },
    {
      id: 'windows' as AudioConfig,
      label: 'Windows Ottimizzato',
      description: '48kHz, noiseSuppression aggressivo',
      icon: '🪟',
    },
    {
      id: 'mobile' as AudioConfig,
      label: 'Mobile Ottimizzato',
      description: '24kHz, riduce banda per mobile',
      icon: '📱',
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          title="Impostazioni Audio"
        >
          <Settings className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>⚙️ Impostazioni Audio</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <RadioGroup value={selectedConfig} onValueChange={(value) => saveAudioConfig(value as AudioConfig)}>
            {configs.map((config) => (
              <div
                key={config.id}
                className={cn(
                  "flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors",
                  selectedConfig === config.id
                    ? "bg-primary/5 border-primary"
                    : "bg-muted/20 border-border hover:bg-muted/40"
                )}
                onClick={() => saveAudioConfig(config.id)}
              >
                <RadioGroupItem value={config.id} id={config.id} className="mt-1" />
                <div className="flex-1 space-y-1">
                  <Label htmlFor={config.id} className="text-sm font-medium cursor-pointer flex items-center gap-2">
                    <span>{config.icon}</span>
                    {config.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">{config.description}</p>
                  <div className="text-[10px] text-muted-foreground mt-1 space-y-0.5">
                    <div>Sample Rate: {audioConfigs[config.id].sampleRate}Hz</div>
                    <div>Echo Cancel: {audioConfigs[config.id].echoCancellation ? '✓' : '✗'}</div>
                    <div>Noise Suppress: {audioConfigs[config.id].noiseSuppression ? '✓' : '✗'}</div>
                    <div>Auto Gain: {audioConfigs[config.id].autoGainControl ? '✓' : '✗'}</div>
                  </div>
                </div>
              </div>
            ))}
          </RadioGroup>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Export helper per ottenere config attuale
export const getAudioConfigSettings = (config: AudioConfig): AudioConfigSettings => {
  return audioConfigs[config];
};
