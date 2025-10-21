import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Volume2 } from 'lucide-react';

interface BarModeControlsProps {
  conversationId: string | null;
  onSettingsChange?: (settings: BarModeSettings) => void;
  globalMaxWords?: number;
  onMaxWordsChange?: (value: number) => void;
}

interface BarModeSettings {
  conversation_pace: 'slow' | 'normal' | 'fast';
  enable_interruptions: boolean;
  auto_play_audio: boolean;
  voice_enabled: boolean;
  audio_mode?: string;
  agent_interaction_mode?: 'consultation' | 'free_bar';
  conversation_style?: 'boss_talk' | 'colleagues' | 'bar_chat';
  preset?: string;
  pause_between_turns_ms?: number;
}

export const BarModeControls = ({ conversationId, onSettingsChange, globalMaxWords, onMaxWordsChange }: BarModeControlsProps) => {
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
      agent_interaction_mode: 'consultation',
      conversation_style: 'colleagues',
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

  // ✅ Validazione rimossa - turn_strategy obsoleto

  // Applica preset completo con nuove mappature
  const applyPreset = (presetName: 'fast' | 'professional' | 'deep') => {
    const presets = {
      fast: {
        audio_mode: 'continuous',
        conversation_pace: 'fast' as const,
        voice_enabled: true,
        preset: 'fast',
        agent_interaction_mode: 'free_bar' as const,
        conversation_style: 'colleagues' as const,
        maxWords: 40
      },
      professional: {
        audio_mode: 'stable',
        conversation_pace: 'normal' as const,
        voice_enabled: true,
        preset: 'professional',
        agent_interaction_mode: 'consultation' as const,
        conversation_style: 'colleagues' as const,
        maxWords: 60
      },
      deep: {
        audio_mode: 'extended',
        conversation_pace: 'slow' as const,
        voice_enabled: true,
        preset: 'deep',
        agent_interaction_mode: 'consultation' as const,
        conversation_style: 'boss_talk' as const,
        maxWords: 100
      },
    };

    const config = presets[presetName];
    
    const newSettings = { ...settings, ...config };
    setSettings(newSettings);
    setPreset(presetName);

    localStorage.setItem('barModeSettings', JSON.stringify(newSettings));
    
    // Aggiorna anche globalMaxWords
    onMaxWordsChange?.(config.maxWords);

    if (conversationId) {
      supabase
        .from('chat_laboratory_bar_mode')
        .update({
          audio_mode: config.audio_mode,
          conversation_pace: config.conversation_pace,
          voice_enabled: config.voice_enabled,
          preset: config.preset,
          agent_interaction_mode: config.agent_interaction_mode,
          conversation_style: config.conversation_style
        })
        .eq('conversation_id', conversationId)
        .then((result) => {
          if (result.error) console.error('❌ Errore salvataggio bar_mode:', result.error);
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
    <div className="space-y-2 p-3 bg-card rounded-lg">
      {/* 🔊 TOGGLE AUDIO - Sempre visibile */}
      <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
        <div className="flex items-center gap-2">
          <Volume2 className={cn(
            "h-5 w-5 transition-colors",
            settings.voice_enabled ? "text-primary animate-pulse" : "text-muted-foreground"
          )} />
          <Label htmlFor="voice-main-toggle" className="text-sm font-semibold cursor-pointer">
            Audio Agenti
          </Label>
        </div>
        <Switch
          id="voice-main-toggle"
          checked={settings.voice_enabled}
          onCheckedChange={(checked) => {
            updateSetting('voice_enabled', checked);
            toast({
              title: checked ? '🔊 Audio attivato' : '🔇 Audio disattivato',
              description: checked 
                ? 'Gli agenti parleranno automaticamente' 
                : 'Solo testo, nessun audio',
            });
          }}
        />
      </div>

      {/* Preset Selector - Una riga orizzontale */}
      <div className="flex items-center gap-2 flex-wrap">
        <Label className="text-xs font-semibold shrink-0">Modalità:</Label>
        
        {/* Preset 1: Veloce */}
        <button
          type="button"
          onClick={() => applyPreset('fast')}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md border transition-all text-xs",
            preset === 'fast' 
              ? "border-primary bg-primary/10 text-primary" 
              : "border-border hover:border-primary/50"
          )}
        >
          <span>⚡</span>
          <span className="font-medium">Veloce</span>
        </button>

        {/* Preset 2: Professionale */}
        <button
          type="button"
          onClick={() => applyPreset('professional')}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md border transition-all text-xs",
            preset === 'professional' 
              ? "border-primary bg-primary/10 text-primary" 
              : "border-border hover:border-primary/50"
          )}
        >
          <span>💼</span>
          <span className="font-medium">Professional</span>
        </button>

        {/* Preset 3: Profonda */}
        <button
          type="button"
          onClick={() => applyPreset('deep')}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md border transition-all text-xs",
            preset === 'deep' 
              ? "border-primary bg-primary/10 text-primary" 
              : "border-border hover:border-primary/50"
          )}
        >
          <span>🧠</span>
          <span className="font-medium">Profonda</span>
        </button>
      </div>

      {/* Stile Conversazione - Sempre visibile */}
      <div className="flex flex-col gap-2 pt-2 border-t border-border/20">
        <Label className="text-xs font-semibold flex items-center gap-2">
          💬 Stile Conversazione
        </Label>
        <Select
          value={settings.conversation_style || 'colleagues'}
          onValueChange={(value: 'boss_talk' | 'colleagues' | 'bar_chat') => {
            updateSetting('conversation_style', value);
            setPreset('custom');
          }}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="boss_talk">
              <div className="flex items-center gap-2">
                <span>🎯</span>
                <span className="font-medium">Boss Talk</span>
              </div>
            </SelectItem>
            <SelectItem value="colleagues">
              <div className="flex items-center gap-2">
                <span>🤝</span>
                <span className="font-medium">Colleghi</span>
              </div>
            </SelectItem>
            <SelectItem value="bar_chat">
              <div className="flex items-center gap-2">
                <span>🍺</span>
                <span className="font-medium">Bar Chat</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="text-[10px] text-muted-foreground leading-tight">
          Tono della conversazione (sovrascrive personalità individuali)
        </p>
      </div>

      {/* Advanced Toggle */}
      <Collapsible>
        <CollapsibleTrigger className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
          <span>⚙️</span>
          <span>Avanzate</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-2">
          {/* Pausa manuale tra agenti */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs">
              Pausa tra agenti (ms)
            </Label>
            <Input
              type="number"
              min="0"
              max="5000"
              step="100"
              value={settings.pause_between_turns_ms || 0}
              onChange={(e) => {
                updateSetting('pause_between_turns_ms', parseInt(e.target.value));
                setPreset('custom');
              }}
              className="h-8 text-xs"
            />
            <p className="text-[10px] text-muted-foreground">
              0ms = Nessuna pausa (più veloce)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="topic-select" className="text-xs shrink-0">Argomento:</Label>
            <Select value={selectedTopic || ''} onValueChange={updateTopic}>
              <SelectTrigger id="topic-select" className="h-8 text-xs">
                <SelectValue placeholder="Seleziona" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="generale">Generale</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="tecnologia">Tech & AI</SelectItem>
                <SelectItem value="creativo">Creativo</SelectItem>
                <SelectItem value="educativo">Educativo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="pace-select" className="text-xs shrink-0">Ritmo:</Label>
            <Select 
              value={settings.conversation_pace} 
              onValueChange={(value: any) => {
                updateSetting('conversation_pace', value);
                setPreset('custom');
              }}
            >
              <SelectTrigger id="pace-select" className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="slow">Lento</SelectItem>
                <SelectItem value="normal">Normale</SelectItem>
                <SelectItem value="fast">Veloce</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="interruptions-toggle" className="text-xs flex-1">
              Interruzioni
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

          {/* 🚧 HYBRID MODE - Temporaneamente disabilitato
          <div className="pt-2 border-t border-border/40">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs h-8"
              onClick={() => {
                updateSetting('audio_mode', 'hybrid');
                setPreset('custom');
                toast({
                  title: '🔄 Hybrid attivata',
                  description: 'Multi-chunk con invio automatico.',
                });
              }}
            >
              🔄 Hybrid (Sperimentale)
            </Button>
          </div>
          */}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};