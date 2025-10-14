import { useState, useEffect } from 'react';
import { BarVoiceRecorder } from './BarVoiceRecorder';
import { BarVoiceRecorderV2_Continuous } from './BarVoiceRecorderV2_Continuous';
import { BarVoiceRecorderV2_Extended } from './BarVoiceRecorderV2_Extended';
import { BarVoiceRecorderV2_Hybrid } from './BarVoiceRecorderV2_Hybrid';
import { InterruptButton } from './InterruptButton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Pause, Play, Brain, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BarChatAudioControlsProps {
  conversationId: string | null;
  isAISpeaking: boolean;
  onTranscriptionComplete: (text: string) => void;
  onInterrupt: () => void;
  className?: string;
}

export const BarChatAudioControls = ({
  conversationId,
  isAISpeaking,
  onTranscriptionComplete,
  onInterrupt,
  className
}: BarChatAudioControlsProps) => {
  const [isPaused, setIsPaused] = useState(false);
  
  // Dynamic Turn-Taking States
  const [turnStrategy, setTurnStrategy] = useState<string>('RANDOM_30');
  const [pauseBetweenTurns, setPauseBetweenTurns] = useState<number>(800);
  const [enableDirectCall, setEnableDirectCall] = useState<boolean>(true);
  
  // 🧪 Test Switcher: Scegli quale variante audio usare
  const [audioMode, setAudioMode] = useState<'stable' | 'v2_continuous' | 'v2_extended' | 'v2_hybrid'>('stable');

  useEffect(() => {
    if (conversationId) {
      loadPauseState();
      loadDynamicTurnSettings();
    }
  }, [conversationId]);


  const loadPauseState = async () => {
    if (!conversationId) return;

    try {
      const { data, error } = await supabase
        .from('chat_laboratory_conversations')
        .select('is_paused')
        .eq('id', conversationId)
        .single();

      if (error) throw error;
      setIsPaused(data?.is_paused || false);
    } catch (error) {
      console.error('Error loading pause state:', error);
    }
  };

  const loadDynamicTurnSettings = async () => {
    if (!conversationId) return;
    
    try {
      const { data, error } = await supabase
        .from('chat_laboratory_bar_mode')
        .select('turn_strategy, pause_between_turns_ms, enable_direct_call_detection')
        .eq('conversation_id', conversationId)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setTurnStrategy(data.turn_strategy || 'RANDOM_30');
        setPauseBetweenTurns(data.pause_between_turns_ms || 800);
        setEnableDirectCall(data.enable_direct_call_detection ?? true);
      }
    } catch (error) {
      console.error('Error loading dynamic turn settings:', error);
    }
  };

  const updateTurnStrategy = async (newStrategy: string) => {
    if (!conversationId) return;
    
    try {
      const { error } = await supabase
        .from('chat_laboratory_bar_mode')
        .update({ turn_strategy: newStrategy })
        .eq('conversation_id', conversationId);
      
      if (error) throw error;
      
      setTurnStrategy(newStrategy);
      toast.success("Strategia aggiornata", {
        description: `Ora usando: ${newStrategy === 'RANDOM_30' ? 'Random' : 'Smart Turn-Taking'}`
      });
    } catch (error) {
      console.error('Error updating turn strategy:', error);
      toast.error("Errore aggiornamento strategia");
    }
  };

  const updatePauseBetweenTurns = async (newPause: number) => {
    if (!conversationId) return;
    
    try {
      const { error } = await supabase
        .from('chat_laboratory_bar_mode')
        .update({ pause_between_turns_ms: newPause })
        .eq('conversation_id', conversationId);
      
      if (error) throw error;
      
      setPauseBetweenTurns(newPause);
    } catch (error) {
      console.error('Error updating pause:', error);
    }
  };

  const updateDirectCallDetection = async (enabled: boolean) => {
    if (!conversationId) return;
    
    try {
      const { error } = await supabase
        .from('chat_laboratory_bar_mode')
        .update({ enable_direct_call_detection: enabled })
        .eq('conversation_id', conversationId);
      
      if (error) throw error;
      
      setEnableDirectCall(enabled);
      toast.success(enabled ? "Chiamate dirette abilitate" : "Chiamate dirette disabilitate");
    } catch (error) {
      console.error('Error updating direct call detection:', error);
    }
  };

  const togglePause = async () => {
    if (!conversationId) return;
    
    const newPauseState = !isPaused;
    
    try {
      const { error } = await supabase
        .from('chat_laboratory_conversations')
        .update({ is_paused: newPauseState })
        .eq('id', conversationId);
      
      if (error) throw error;
      
      setIsPaused(newPauseState);
      
      toast[newPauseState ? 'warning' : 'success'](
        newPauseState ? "⏸️ Conversazione in Pausa" : "▶️ Conversazione Ripresa",
        {
          description: newPauseState 
            ? "L'AI non risponderà fino alla ripresa" 
            : "L'AI può nuovamente rispondere"
        }
      );
    } catch (error) {
      console.error('Error toggling pause:', error);
      toast.error("Errore", {
        description: "Impossibile cambiare stato pausa"
      });
    }
  };

  const isSmartMode = turnStrategy !== 'RANDOM_30';

  return (
    <div className={cn(
      "border-t border-border/40 backdrop-blur-xl bg-background/80",
      "p-6 rounded-lg shadow-lg space-y-4",
      className
    )}>
      {/* Riga 1: Controlli principali */}
      <div className="flex justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          {/* Conditional Audio Recorder based on audioMode */}
          {audioMode === 'stable' && (
            <BarVoiceRecorder
              conversationId={conversationId}
              onTranscriptionComplete={onTranscriptionComplete}
              isDisabled={isAISpeaking}
            />
          )}
          
          {audioMode === 'v2_continuous' && (
            <BarVoiceRecorderV2_Continuous
              conversationId={conversationId}
              onTranscriptionComplete={onTranscriptionComplete}
              isDisabled={isAISpeaking}
            />
          )}
          
          {audioMode === 'v2_extended' && (
            <BarVoiceRecorderV2_Extended
              conversationId={conversationId}
              onTranscriptionComplete={onTranscriptionComplete}
              isDisabled={isAISpeaking}
            />
          )}
          
          {audioMode === 'v2_hybrid' && (
            <BarVoiceRecorderV2_Hybrid
              conversationId={conversationId}
              onTranscriptionComplete={onTranscriptionComplete}
              isDisabled={isAISpeaking}
            />
          )}

          {/* Pause/Resume Button */}
          <Button
            variant={isPaused ? "default" : "ghost"}
            size="icon"
            onClick={togglePause}
            className={cn(
              "h-12 w-12 rounded-full transition-all",
              isPaused && "bg-yellow-500 hover:bg-yellow-600 text-white"
            )}
            title={isPaused ? "Riprendi conversazione" : "Pausa conversazione"}
          >
            {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
          </Button>

          {/* Interrupt Button - visibile solo quando AI parla */}
          <InterruptButton
            isAISpeaking={isAISpeaking}
            onInterrupt={onInterrupt}
          />
        </div>

        {/* 🧪 Test Switcher - Allineato a destra */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            🧪 Test Audio
          </label>
          <select
            value={audioMode}
            onChange={(e) => setAudioMode(e.target.value as any)}
            className="px-3 py-2 bg-background border border-input rounded-md text-sm z-50"
          >
            <option value="stable">✅ STABLE (PTT 3s)</option>
            <option value="v2_continuous">🔵 Continuous (1.5s)</option>
            <option value="v2_extended">🟢 Extended (Hold)</option>
            <option value="v2_hybrid">🟡 Hybrid (Listen)</option>
          </select>
        </div>
      </div>

      {/* Riga 2: Dynamic Turn-Taking Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-4 border-t border-border/20">
        {/* Turn Strategy Toggle */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <Label 
              className={cn(
                "text-sm font-medium cursor-pointer transition-colors",
                !isSmartMode ? "text-foreground" : "text-muted-foreground"
              )}
            >
              Random
            </Label>
          </div>
          <Switch
            checked={isSmartMode}
            onCheckedChange={(checked) => 
              updateTurnStrategy(checked ? 'SMART_PRIORITY' : 'RANDOM_30')
            }
            disabled={!conversationId}
          />
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-muted-foreground" />
            <Label 
              className={cn(
                "text-sm font-medium cursor-pointer transition-colors",
                isSmartMode ? "text-foreground" : "text-muted-foreground"
              )}
            >
              Smart Turn-Taking
            </Label>
          </div>
        </div>

        {/* Pause Between Turns Slider */}
        <div className="flex items-center gap-3 flex-1 min-w-[200px]">
          <Label className="text-sm whitespace-nowrap">
            Pausa: {pauseBetweenTurns}ms
          </Label>
          <Slider
            value={[pauseBetweenTurns]}
            onValueChange={(values) => updatePauseBetweenTurns(values[0])}
            min={400}
            max={2000}
            step={100}
            className="flex-1"
            disabled={!conversationId}
          />
        </div>

        {/* Direct Call Detection Switch */}
        <div className="flex items-center gap-2">
          <Switch
            checked={enableDirectCall}
            onCheckedChange={updateDirectCallDetection}
            disabled={!conversationId}
          />
          <Label className="text-sm cursor-pointer">
            Chiamate dirette (@nome)
          </Label>
        </div>
      </div>

    </div>
  );
};
