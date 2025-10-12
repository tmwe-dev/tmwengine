import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Timer, Zap, Play, Mic } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface BarModeControlsProps {
  conversationId: string | null;
  onSettingsChange?: (settings: BarModeSettings) => void;
}

interface BarModeSettings {
  conversation_pace: 'slow' | 'normal' | 'fast';
  enable_interruptions: boolean;
  auto_play_audio: boolean;
  voice_enabled: boolean;
  active_elevenlabs_agents: string[];
}

interface ElevenLabsAgent {
  id: string;
  name: string;
  voice_id: string;
  is_active: boolean;
}

export const BarModeControls = ({ conversationId, onSettingsChange }: BarModeControlsProps) => {
  const [settings, setSettings] = useState<BarModeSettings>({
    conversation_pace: 'normal',
    enable_interruptions: true,
    auto_play_audio: true,
    voice_enabled: false,
    active_elevenlabs_agents: [],
  });
  
  const [agents, setAgents] = useState<ElevenLabsAgent[]>([]);

  useEffect(() => {
    loadElevenLabsAgents();
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

  const loadElevenLabsAgents = async () => {
    try {
      const { data } = await supabase
        .from('elevenlabs_agents')
        .select('id, name, voice_id, is_active')
        .order('order_index', { ascending: true });
      
      if (data) {
        setAgents(data);
      }
    } catch (error) {
      console.error('Errore caricamento agenti:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const { data } = await supabase
        .from('chat_laboratory_bar_mode')
        .select('conversation_pace, enable_interruptions, auto_play_audio, voice_enabled, active_elevenlabs_agents')
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

  const [selectedTopic, setSelectedTopic] = useState<string>('');

  useEffect(() => {
    if (conversationId) {
      loadTopic();
    } else {
      const pending = localStorage.getItem('bar-mode-topic-pending');
      if (pending) {
        setSelectedTopic(pending);
      }
    }
  }, [conversationId]);

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

  const updateTopic = async (topic: string) => {
    setSelectedTopic(topic);

    if (conversationId) {
      try {
        await supabase
          .from('chat_laboratory_bar_mode')
          .update({ selected_topic: topic })
          .eq('conversation_id', conversationId);
      } catch (error) {
        console.error('Errore salvataggio topic:', error);
      }
    } else {
      localStorage.setItem('bar-mode-topic-pending', topic);
    }
  };

  const toggleAgent = (agentId: string) => {
    const newAgents = settings.active_elevenlabs_agents.includes(agentId)
      ? settings.active_elevenlabs_agents.filter(id => id !== agentId)
      : [...settings.active_elevenlabs_agents, agentId];
    
    updateSetting('active_elevenlabs_agents', newAgents);
  };

  return (
    <div className="space-y-3">
      {/* Topic Selector */}
      <div className="grid grid-cols-2 gap-4 p-3 rounded-lg border border-border/40 bg-card/40">
        {/* Topic Selector - occupa tutta la riga */}
        <div className="flex items-center gap-2 col-span-2">
          <Label htmlFor="topic" className="text-sm w-24">Argomento:</Label>
          <Select value={selectedTopic} onValueChange={updateTopic}>
            <SelectTrigger id="topic" className="flex-1 h-8">
              <SelectValue placeholder="Seleziona argomento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nessuno</SelectItem>
              <SelectItem value="logistica">📦 Logistica</SelectItem>
              <SelectItem value="medico">🏥 Medicina</SelectItem>
              <SelectItem value="fiscale">💼 Fiscalità</SelectItem>
              <SelectItem value="ingegneria">⚙️ Ingegneria</SelectItem>
              <SelectItem value="informatica">💻 Informatica</SelectItem>
              <SelectItem value="consulenza">🎯 Consulenza</SelectItem>
              <SelectItem value="ristorazione">🍽️ Ristorazione</SelectItem>
              <SelectItem value="strategia">📊 Strategia</SelectItem>
              <SelectItem value="filosofia">🧠 Filosofia</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Ritmo Conversazione - occupa tutta la riga */}
        <div className="flex items-center gap-2 col-span-2">
          <Timer className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="pace" className="text-sm w-24">Ritmo:</Label>
          <Select
            value={settings.conversation_pace}
            onValueChange={(value: 'slow' | 'normal' | 'fast') => 
              updateSetting('conversation_pace', value)
            }
          >
            <SelectTrigger id="pace" className="flex-1 h-8">
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
          <Label htmlFor="interruptions" className="text-sm cursor-pointer w-24">
            Interruzioni
          </Label>
          <Switch
            id="interruptions"
            checked={settings.enable_interruptions}
            onCheckedChange={(checked) => updateSetting('enable_interruptions', checked)}
            className="ml-auto"
          />
        </div>

        {/* Auto-Play Audio */}
        <div className="flex items-center gap-2">
          <Play className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="autoplay" className="text-sm cursor-pointer w-24">
            Auto-Play
          </Label>
          <Switch
            id="autoplay"
            checked={settings.auto_play_audio}
            onCheckedChange={(checked) => updateSetting('auto_play_audio', checked)}
            className="ml-auto"
          />
        </div>

        {/* Voice Enabled */}
        <div className="flex items-center gap-2 col-span-2">
          <Mic className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="voice" className="text-sm cursor-pointer w-24">
            Voice TTS
          </Label>
          <Switch
            id="voice"
            checked={settings.voice_enabled}
            onCheckedChange={(checked) => updateSetting('voice_enabled', checked)}
            className="ml-auto"
          />
        </div>

        {/* Continuous Mic (solo visivo per ora, la logica è nei BarChatAudioControls) */}
        <div className="flex items-center gap-2 col-span-2">
          <Mic className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm text-muted-foreground w-24">
            Mic Continuo
          </Label>
          <span className="text-xs text-muted-foreground ml-auto">
            Attiva/Disattiva con tasto 🍺 in basso
          </span>
        </div>

        {/* ElevenLabs Agents Selection */}
        {settings.voice_enabled && agents.length > 0 && (
          <div className="col-span-2 space-y-2 p-2 rounded-md border border-border/30 bg-muted/20">
            <Label className="text-xs text-muted-foreground">Agenti vocali attivi:</Label>
            <div className="space-y-1">
              {agents.filter(a => a.is_active).map((agent) => (
                <div key={agent.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`agent-${agent.id}`}
                    checked={settings.active_elevenlabs_agents.includes(agent.id)}
                    onCheckedChange={() => toggleAgent(agent.id)}
                  />
                  <Label 
                    htmlFor={`agent-${agent.id}`} 
                    className="text-xs cursor-pointer flex-1"
                  >
                    {agent.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
