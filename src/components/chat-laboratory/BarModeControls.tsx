import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Timer, Zap } from 'lucide-react';

interface BarModeControlsProps {
  conversationId: string | null;
  onSettingsChange?: (settings: BarModeSettings) => void;
}

interface BarModeSettings {
  conversation_pace: 'slow' | 'normal' | 'fast';
  enable_interruptions: boolean;
  auto_play_audio: boolean;
}

export const BarModeControls = ({ conversationId, onSettingsChange }: BarModeControlsProps) => {
  const [settings, setSettings] = useState<BarModeSettings>({
    conversation_pace: 'normal',
    enable_interruptions: true,
    auto_play_audio: true,
  });

  useEffect(() => {
    if (conversationId) {
      loadSettings();
    } else {
      // Carica da localStorage se non c'è conversationId
      const pending = localStorage.getItem('bar-mode-controls-pending');
      if (pending) {
        const saved = JSON.parse(pending);
        setSettings(saved);
        onSettingsChange?.(saved);
      }
    }
  }, [conversationId]);

  const loadSettings = async () => {
    try {
      const { data } = await supabase
        .from('chat_laboratory_bar_mode')
        .select('conversation_pace, enable_interruptions, auto_play_audio')
        .eq('conversation_id', conversationId)
        .single();

      if (data) {
        setSettings(data as BarModeSettings);
        onSettingsChange?.(data as BarModeSettings);
      }
    } catch (error) {
      console.error('Errore caricamento impostazioni:', error);
    }
  };

  const updateSetting = async <K extends keyof BarModeSettings>(
    key: K,
    value: BarModeSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    onSettingsChange?.(newSettings);

    if (conversationId) {
      // Salva nel database
      try {
        await supabase
          .from('chat_laboratory_bar_mode')
          .update({ [key]: value })
          .eq('conversation_id', conversationId);
      } catch (error) {
        console.error('Errore salvataggio impostazione:', error);
      }
    } else {
      // Salva in localStorage
      localStorage.setItem('bar-mode-controls-pending', JSON.stringify(newSettings));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4 p-3 rounded-lg border border-border/40 bg-card/40">
      {/* Ritmo Conversazione */}
      <div className="flex items-center gap-2">
        <Timer className="h-4 w-4 text-muted-foreground" />
        <Label htmlFor="pace" className="text-sm">Ritmo:</Label>
        <Select
          value={settings.conversation_pace}
          onValueChange={(value: 'slow' | 'normal' | 'fast') => 
            updateSetting('conversation_pace', value)
          }
        >
          <SelectTrigger id="pace" className="w-32 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="slow">🐌 Lento</SelectItem>
            <SelectItem value="normal">⚡ Normale</SelectItem>
            <SelectItem value="fast">🚀 Veloce</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Interruzioni */}
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-muted-foreground" />
        <Label htmlFor="interruptions" className="text-sm cursor-pointer">
          Interruzioni
        </Label>
        <Switch
          id="interruptions"
          checked={settings.enable_interruptions}
          onCheckedChange={(checked) => updateSetting('enable_interruptions', checked)}
        />
      </div>

      {/* Auto-Play Audio */}
      <div className="flex items-center gap-2">
        <Label htmlFor="autoplay" className="text-sm cursor-pointer">
          Auto-Play
        </Label>
        <Switch
          id="autoplay"
          checked={settings.auto_play_audio}
          onCheckedChange={(checked) => updateSetting('auto_play_audio', checked)}
        />
      </div>
    </div>
  );
};
