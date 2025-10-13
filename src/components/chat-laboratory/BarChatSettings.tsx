import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { MessageSquare, Timer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BarChatSettingsProps {
  conversationId: string | null;
  onSettingsChange?: (settings: { conversation_style: string; vad_silence_duration: number; response_mode: string }) => void;
}

export const BarChatSettings = ({ conversationId, onSettingsChange }: BarChatSettingsProps) => {
  const [conversationStyle, setConversationStyle] = useState('colleagues');
  const [vadDuration, setVadDuration] = useState(3000);
  const [responseMode, setResponseMode] = useState('single');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (conversationId) {
      loadSettings();
    }
  }, [conversationId]);

  const loadSettings = async () => {
    if (!conversationId) return;

    try {
      const { data, error } = await supabase
        .from('chat_laboratory_conversations')
        .select('conversation_style, vad_silence_duration, response_mode')
        .eq('id', conversationId)
        .single();

      if (error) throw error;

      if (data) {
        setConversationStyle(data.conversation_style || 'colleagues');
        setVadDuration(data.vad_silence_duration || 3000);
        setResponseMode(data.response_mode || 'single');
      }
    } catch (error) {
      console.error('Error loading bar chat settings:', error);
    }
  };

  const updateSetting = async (field: string, value: any) => {
    if (!conversationId) {
      localStorage.setItem(`bar_chat_${field}`, value.toString());
      
      if (field === 'conversation_style') {
        setConversationStyle(value);
      } else if (field === 'vad_silence_duration') {
        setVadDuration(value);
      } else if (field === 'response_mode') {
        setResponseMode(value);
      }

      onSettingsChange?.({
        conversation_style: field === 'conversation_style' ? value : conversationStyle,
        vad_silence_duration: field === 'vad_silence_duration' ? value : vadDuration,
        response_mode: field === 'response_mode' ? value : responseMode
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('chat_laboratory_conversations')
        .update({ [field]: value })
        .eq('id', conversationId);

      if (error) throw error;

      if (field === 'conversation_style') {
        setConversationStyle(value);
        toast.success(`Stile: ${value === 'boss_talk' ? '🎯 Boss Talk' : value === 'colleagues' ? '🤝 Colleghi' : '🍺 Bar Chat'}`);
      } else if (field === 'vad_silence_duration') {
        setVadDuration(value);
        toast.success(`VAD: ${(value / 1000).toFixed(1)}s`);
      } else if (field === 'response_mode') {
        setResponseMode(value);
        toast.success(`Modalità: ${value === 'single' ? '🎯 Sequenziale' : value === 'all' ? '🔀 Parallelo' : '🤖 Auto'}`);
      }

      onSettingsChange?.({
        conversation_style: field === 'conversation_style' ? value : conversationStyle,
        vad_silence_duration: field === 'vad_silence_duration' ? value : vadDuration,
        response_mode: field === 'response_mode' ? value : responseMode
      });
    } catch (error) {
      console.error('Error updating bar chat setting:', error);
      toast.error('Errore aggiornamento');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 border border-border/40 rounded-lg bg-card/30">
      {/* Conversation Style Selector */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <Label className="text-sm font-medium">Stile Conversazione</Label>
        </div>
        <Select
          value={conversationStyle}
          onValueChange={(value) => updateSetting('conversation_style', value)}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleziona stile" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="boss_talk">
              <div className="flex flex-col">
                <span className="font-semibold">🎯 Boss Talk</span>
                <span className="text-xs text-muted-foreground">Pragmatico, sintetico, orientato ai risultati</span>
              </div>
            </SelectItem>
            <SelectItem value="colleagues">
              <div className="flex flex-col">
                <span className="font-semibold">🤝 Colleghi</span>
                <span className="text-xs text-muted-foreground">Professionale ma amichevole, bilanciato</span>
              </div>
            </SelectItem>
            <SelectItem value="bar_chat">
              <div className="flex flex-col">
                <span className="font-semibold">🍺 Bar Chat</span>
                <span className="text-xs text-muted-foreground">Informale, scherzoso, rilassato</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Response Mode Selector */}
      <div className="flex flex-col gap-2 pt-2 border-t border-border/20">
        <Label className="text-sm font-medium">Modalità Risposta</Label>
        <Select
          value={responseMode}
          onValueChange={(value) => updateSetting('response_mode', value)}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleziona modalità" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="single">
              <div className="flex flex-col">
                <span className="font-semibold">🎯 Sequenziale</span>
                <span className="text-xs text-muted-foreground">Un agente alla volta (come al bar)</span>
              </div>
            </SelectItem>
            <SelectItem value="all">
              <div className="flex flex-col">
                <span className="font-semibold">🔀 Parallelo</span>
                <span className="text-xs text-muted-foreground">Tutti gli agenti rispondono insieme</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* VAD Threshold Slider */}
      <div className="flex flex-col gap-2 pt-2 border-t border-border/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-primary" />
            <Label className="text-sm font-medium">VAD Threshold</Label>
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            {(vadDuration / 1000).toFixed(1)}s
          </span>
        </div>
        <Slider
          value={[vadDuration]}
          onValueChange={([value]) => updateSetting('vad_silence_duration', value)}
          min={1000}
          max={5000}
          step={500}
          disabled={isLoading}
          className="w-full"
        />
        <p className="text-xs text-muted-foreground">
          Tempo di silenzio prima di inviare (1-5 sec)
        </p>
      </div>
    </div>
  );
};
