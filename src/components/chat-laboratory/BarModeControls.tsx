import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BarModeControlsProps {
  conversationId: string | null;
  onSettingsChange?: (settings: BarModeSettings) => void;
}

interface BarModeSettings {
  conversation_pace: 'slow' | 'normal' | 'fast';
  enable_interruptions: boolean;
  auto_play_audio: boolean;
  voice_enabled: boolean;
  audio_mode?: string;
  turn_strategy?: string;
  preset?: string;
}

export const BarModeControls = ({ conversationId, onSettingsChange }: BarModeControlsProps) => {
  const { toast } = useToast();

  const [settings, setSettings] = useState<BarModeSettings>(() => {
    const globalSettings = localStorage.getItem('barModeSettings');
    if (globalSettings) {
      return JSON.parse(globalSettings);
    }

    const pendingSettings = localStorage.getItem('barModePendingSettings');
    if (pendingSettings) {
      return JSON.parse(pendingSettings);
    }

    const defaultSettings: BarModeSettings = {
      conversation_pace: 'normal',
      enable_interruptions: true,
      auto_play_audio: true,
      voice_enabled: true,
      audio_mode: 'stable',
      turn_strategy: 'RANDOM_30',
      preset: 'professional'
    };

    return defaultSettings;
  });

  const [preset, setPreset] = useState<'fast' | 'professional' | 'deep' | 'custom'>(
    (settings.preset as any) || 'professional'
  );

  const [selectedTopic, setSelectedTopic] = useState<string>('');

  useEffect(() => {
    if (conversationId) {
      loadSettings();
      loadTopic();
    } else {
      const pending = localStorage.getItem('barModePendingTopic');
      if (pending) {
        setSelectedTopic(pending);
      }
      onSettingsChange?.(settings);
    }
  }, [conversationId]);

  const loadSettings = async () => {
    try {
      const { data } = await supabase
        .from('chat_laboratory_bar_mode')
        .select('*')
        .eq('conversation_id', conversationId)
        .single();

      if (data) {
        console.log('🎙️ BarModeControls - Caricato da DB:', data);
        setSettings(data as BarModeSettings);
        setPreset((data.preset as any) || 'professional');
        onSettingsChange?.(data as BarModeSettings);
      }
    } catch (error) {
      console.error('Errore caricamento impostazioni:', error);
    }
  };

  const loadTopic = async () => {
    try {
      const { data } = await supabase
        .from('chat_laboratory_bar_mode')
        .select('selected_topic')
        .eq('conversation_id', conversationId)
        .single();

      if (data?.selected_topic) {
        setSelectedTopic(data.selected_topic);
      }
    } catch (error) {
      console.error('Errore caricamento topic:', error);
    }
  };

  const updateSetting = async <K extends keyof BarModeSettings>(
    key: K,
    value: BarModeSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    onSettingsChange?.(newSettings);

    localStorage.setItem('barModeSettings', JSON.stringify(newSettings));

    if (conversationId) {
      try {
        await supabase
          .from('chat_laboratory_bar_mode')
          .update({ [key]: value })
          .eq('conversation_id', conversationId);
      } catch (error) {
        console.error('Errore salvataggio impostazione:', error);
      }
    } else {
      localStorage.setItem('barModePendingSettings', JSON.stringify(newSettings));
    }
  };

  const updateTopic = async (topic: string) => {
    setSelectedTopic(topic);

    if (conversationId) {
      const { error } = await supabase
        .from('chat_laboratory_bar_mode')
        .update({ selected_topic: topic })
        .eq('conversation_id', conversationId);

      if (error) {
        console.error('❌ Errore aggiornamento topic:', error);
      }
    } else {
      localStorage.setItem('barModePendingTopic', topic);
    }
  };

  // ⚠️ Validazione: Continuous + Smart Priority = INCOMPATIBILE
  useEffect(() => {
    if (settings.audio_mode === 'continuous' && settings.turn_strategy === 'SMART_PRIORITY') {
      console.warn('⚠️ Continuous + Smart Priority incompatibile, switch a Random');
      updateSetting('turn_strategy', 'RANDOM_30');
      toast({
        title: '⚠️ Configurazione incompatibile',
        description: 'Continuous richiede Random Turn-Taking. Ho corretto automaticamente.',
      });
    }
  }, [settings.audio_mode, settings.turn_strategy]);

  // Applica preset completo
  const applyPreset = (presetName: 'fast' | 'professional' | 'deep') => {
    const presets = {
      fast: {
        audio_mode: 'continuous',
        turn_strategy: 'RANDOM_30',
        conversation_pace: 'fast' as const,
        voice_enabled: true,
        preset: 'fast'
      },
      professional: {
        audio_mode: 'stable',
        turn_strategy: 'RANDOM_30',
        conversation_pace: 'normal' as const,
        voice_enabled: true,
        preset: 'professional'
      },
      deep: {
        audio_mode: 'extended',
        turn_strategy: 'SMART_PRIORITY',
        conversation_pace: 'slow' as const,
        voice_enabled: true,
        preset: 'deep'
      },
    };

    const config = presets[presetName];
    
    const newSettings = { ...settings, ...config };
    setSettings(newSettings);
    setPreset(presetName);

    localStorage.setItem('barModeSettings', JSON.stringify(newSettings));

    if (conversationId) {
      supabase
        .from('chat_laboratory_bar_mode')
        .update(config)
        .eq('conversation_id', conversationId)
        .then(({ error }) => {
          if (error) console.error('❌ Errore salvataggio preset:', error);
        });
    } else {
      localStorage.setItem('barModePendingSettings', JSON.stringify(newSettings));
    }

    onSettingsChange?.(newSettings);
    
    toast({
      title: '✅ Preset applicato',
      description: `Configurazione "${presetName}" attivata`,
    });
  };

  return (
    <div className="space-y-4 p-4 bg-card rounded-lg border border-border">
      {/* Preset Selector */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Modalità Conversazione:</Label>
        <div className="grid grid-cols-1 gap-2">
          <Button
            variant={preset === 'fast' ? 'default' : 'outline'}
            className="justify-start h-auto py-3 px-4 text-left"
            onClick={() => applyPreset('fast')}
          >
            <div className="w-full">
              <div className="font-semibold">⚡ Conversazione Veloce</div>
              <div className="text-xs text-muted-foreground mt-1">
                Premi 🎤 → Parla → Auto-stop silenzio 1.5s
              </div>
            </div>
          </Button>

          <Button
            variant={preset === 'professional' ? 'default' : 'outline'}
            className="justify-start h-auto py-3 px-4 text-left"
            onClick={() => applyPreset('professional')}
          >
            <div className="w-full">
              <div className="font-semibold">💼 Conversazione Professionale</div>
              <div className="text-xs text-muted-foreground mt-1">
                Premi 🎤 → Registra → Ripremi per inviare
              </div>
            </div>
          </Button>

          <Button
            variant={preset === 'deep' ? 'default' : 'outline'}
            className="justify-start h-auto py-3 px-4 text-left"
            onClick={() => applyPreset('deep')}
          >
            <div className="w-full">
              <div className="font-semibold">🧠 Discussione Profonda</div>
              <div className="text-xs text-muted-foreground mt-1">
                TIENI PREMUTO 🎤 per parlare → Rilascia → Auto-invio 1.5s
              </div>
            </div>
          </Button>
        </div>
      </div>

      {/* Advanced Toggle */}
      <Collapsible>
        <CollapsibleTrigger className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          ⚙️ Avanzate
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="topic-select" className="text-sm">Argomento della conversazione</Label>
            <Select value={selectedTopic || ''} onValueChange={updateTopic}>
              <SelectTrigger id="topic-select">
                <SelectValue placeholder="Seleziona un argomento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="generale">Generale</SelectItem>
                <SelectItem value="business">Business & Strategy</SelectItem>
                <SelectItem value="tecnologia">Tecnologia & AI</SelectItem>
                <SelectItem value="creativo">Creativo & Brainstorming</SelectItem>
                <SelectItem value="educativo">Educativo & Formazione</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="pace-select" className="text-sm">Ritmo conversazione</Label>
            <Select 
              value={settings.conversation_pace} 
              onValueChange={(value: any) => {
                updateSetting('conversation_pace', value);
                setPreset('custom');
              }}
            >
              <SelectTrigger id="pace-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="slow">Lento</SelectItem>
                <SelectItem value="normal">Normale</SelectItem>
                <SelectItem value="fast">Veloce</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="interruptions-toggle" className="text-sm">
              Abilita interruzioni
            </Label>
            <Switch
              id="interruptions-toggle"
              checked={settings.enable_interruptions}
              onCheckedChange={(checked) => {
                updateSetting('enable_interruptions', checked);
                setPreset('custom');
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="voice-toggle" className="text-sm">
              Voce AI attiva
            </Label>
            <Switch
              id="voice-toggle"
              checked={settings.voice_enabled}
              onCheckedChange={(checked) => {
                updateSetting('voice_enabled', checked);
                setPreset('custom');
              }}
            />
          </div>

          <div className="pt-2 border-t border-border/40">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                updateSetting('audio_mode', 'hybrid');
                updateSetting('turn_strategy', 'RANDOM_30');
                setPreset('custom');
                toast({
                  title: '🔄 Modalità Hybrid attivata',
                  description: 'Multi-chunk con invio automatico ogni pausa.',
                });
              }}
            >
              🔄 Attiva Modalità Hybrid (Sperimentale)
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};