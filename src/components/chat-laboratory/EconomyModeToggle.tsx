import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { DollarSign, FileText, Zap, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EconomyModeToggleProps {
  conversationId: string | null;
  onSettingsChange?: (settings: { 
    economy_mode: boolean; 
    show_summaries_only: boolean;
    reduce_user_messages: boolean;
    pause_between_agents_ms: number;
  }) => void;
}

export const EconomyModeToggle = ({ conversationId, onSettingsChange }: EconomyModeToggleProps) => {
  const [economyMode, setEconomyMode] = useState(true);
  const [showSummaries, setShowSummaries] = useState(true);
  const [reduceUserMessages, setReduceUserMessages] = useState(true);
  const [pauseBetweenAgents, setPauseBetweenAgents] = useState(800);
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
        .select('economy_mode, show_summaries_only, reduce_user_messages, pause_between_agents_ms')
        .eq('id', conversationId)
        .single();

      if (error) throw error;

      if (data) {
        setEconomyMode(data.economy_mode ?? true);
        setShowSummaries(data.show_summaries_only ?? true);
        setReduceUserMessages(data.reduce_user_messages ?? true);
        setPauseBetweenAgents(data.pause_between_agents_ms ?? 800);
      }
    } catch (error) {
      console.error('Error loading economy settings:', error);
    }
  };

  const updateSetting = async (
    field: 'economy_mode' | 'show_summaries_only' | 'reduce_user_messages', 
    value: boolean
  ) => {
    if (!conversationId) {
      localStorage.setItem(`chat_lab_${field}`, value.toString());
      
      if (field === 'economy_mode') setEconomyMode(value);
      else if (field === 'show_summaries_only') setShowSummaries(value);
      else if (field === 'reduce_user_messages') setReduceUserMessages(value);

      onSettingsChange?.({
        economy_mode: field === 'economy_mode' ? value : economyMode,
        show_summaries_only: field === 'show_summaries_only' ? value : showSummaries,
        reduce_user_messages: field === 'reduce_user_messages' ? value : reduceUserMessages,
        pause_between_agents_ms: pauseBetweenAgents
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

      if (field === 'economy_mode') setEconomyMode(value);
      else if (field === 'show_summaries_only') setShowSummaries(value);
      else if (field === 'reduce_user_messages') setReduceUserMessages(value);

      onSettingsChange?.({
        economy_mode: field === 'economy_mode' ? value : economyMode,
        show_summaries_only: field === 'show_summaries_only' ? value : showSummaries,
        reduce_user_messages: field === 'reduce_user_messages' ? value : reduceUserMessages,
        pause_between_agents_ms: pauseBetweenAgents
      });

      const labels = {
        economy_mode: 'Economy Mode',
        show_summaries_only: 'Vista Riassunti',
        reduce_user_messages: 'Riduzione Messaggi'
      };
      toast.success(`${labels[field]} aggiornata`);
    } catch (error) {
      console.error('Error updating setting:', error);
      toast.error('Errore durante aggiornamento');
    } finally {
      setIsLoading(false);
    }
  };

  const updatePause = async (value: number) => {
    setPauseBetweenAgents(value);
    
    if (!conversationId) {
      localStorage.setItem('chat_lab_pause_between_agents_ms', value.toString());
      onSettingsChange?.({
        economy_mode: economyMode,
        show_summaries_only: showSummaries,
        reduce_user_messages: reduceUserMessages,
        pause_between_agents_ms: value
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('chat_laboratory_conversations')
        .update({ pause_between_agents_ms: value })
        .eq('id', conversationId);

      if (error) throw error;

      onSettingsChange?.({
        economy_mode: economyMode,
        show_summaries_only: showSummaries,
        reduce_user_messages: reduceUserMessages,
        pause_between_agents_ms: value
      });
    } catch (error) {
      console.error('Error updating pause:', error);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4 border rounded-lg bg-card/50">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          <Label htmlFor="economy-mode-lab" className="text-sm font-medium cursor-pointer">
            Economy Mode
          </Label>
        </div>
        <Switch
          id="economy-mode-lab"
          checked={economyMode}
          onCheckedChange={(checked) => updateSetting('economy_mode', checked)}
          disabled={isLoading}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        AI legge riassunti ultra-compressi per risparmiare token
      </p>

      <div className="flex items-center justify-between gap-3 pt-2 border-t">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <Label htmlFor="show-summaries-lab" className="text-sm font-medium cursor-pointer">
            Mostra Riassunti
          </Label>
        </div>
        <Switch
          id="show-summaries-lab"
          checked={showSummaries}
          onCheckedChange={(checked) => updateSetting('show_summaries_only', checked)}
          disabled={isLoading}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Visualizza versioni user-friendly dei messaggi AI
      </p>

      <div className="flex items-center justify-between gap-3 pt-2 border-t">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <Label htmlFor="reduce-messages-lab" className="text-sm font-medium cursor-pointer">
            Riduzione Messaggi
          </Label>
        </div>
        <Switch
          id="reduce-messages-lab"
          checked={reduceUserMessages}
          onCheckedChange={(checked) => updateSetting('reduce_user_messages', checked)}
          disabled={isLoading}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Riassumi automaticamente messaggi lunghi (-70% token)
      </p>

      <div className="flex flex-col gap-2 pt-2 border-t">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <Label className="text-sm font-medium">Pausa tra AI</Label>
          </div>
          <span className="text-xs text-muted-foreground">{pauseBetweenAgents}ms</span>
        </div>
        <Slider
          value={[pauseBetweenAgents]}
          onValueChange={([value]) => updatePause(value)}
          min={500}
          max={2000}
          step={100}
          disabled={isLoading}
          className="w-full"
        />
        <p className="text-xs text-muted-foreground">
          Timing per sequential context (500ms = veloce, 2000ms = riflessivo)
        </p>
      </div>
    </div>
  );
};
