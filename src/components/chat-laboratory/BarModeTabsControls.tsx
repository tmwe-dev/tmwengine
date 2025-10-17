import { useState, useEffect } from 'react';
import { DynamicTabs, TabItem } from '@/components/design-system';
import { BarVoiceRecorder } from './BarVoiceRecorder';
import { BarVoiceRecorderV2_Continuous } from './BarVoiceRecorderV2_Continuous';
import { BarVoiceRecorderV2_Extended } from './BarVoiceRecorderV2_Extended';
import { BarVoiceRecorderV2_Hybrid } from './BarVoiceRecorderV2_Hybrid';
import { InterruptButton } from './InterruptButton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Pause, Play, Brain, Zap, Mic, Beaker } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BarModeTabsControlsProps {
  conversationId: string | null;
  isAISpeaking: boolean;
  onTranscriptionComplete: (text: string) => void;
  onInterrupt: () => void;
  className?: string;
}

export const BarModeTabsControls = ({
  conversationId,
  isAISpeaking,
  onTranscriptionComplete,
  onInterrupt,
  className
}: BarModeTabsControlsProps) => {
  const [isPaused, setIsPaused] = useState(false);
  const [turnStrategy, setTurnStrategy] = useState<string>('RANDOM_30');
  const [pauseBetweenTurns, setPauseBetweenTurns] = useState<number>(800);
  const [enableDirectCall, setEnableDirectCall] = useState<boolean>(true);
  const [audioMode, setAudioMode] = useState<'stable' | 'v2_continuous' | 'v2_extended' | 'v2_hybrid'>('stable');

  useEffect(() => {
    console.log('🎛️ BarModeTabsControls mounted:', { conversationId });
    if (conversationId) {
      loadPauseState();
      loadDynamicTurnSettings();
      loadAudioMode();
    }
  }, [conversationId]);

  const loadAudioMode = () => {
    if (!conversationId) return;
    const stored = localStorage.getItem(`audio-mode-${conversationId}`);
    if (stored) {
      setAudioMode(stored as any);
    }
  };

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

  const tabs: TabItem[] = [
    {
      value: 'audio',
      label: 'Controlli Audio',
      icon: Mic,
      content: (
        <div className="space-y-4 max-h-[40vh] overflow-y-auto p-4">
          {/* Sezione Pausa */}
          <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border/40">
            <div className="flex items-center gap-3">
              <Button
                variant={isPaused ? "default" : "ghost"}
                size="icon"
                onClick={togglePause}
                className={cn(
                  "h-10 w-10 rounded-full transition-all",
                  isPaused && "bg-yellow-500 hover:bg-yellow-600 text-white"
                )}
                title={isPaused ? "Riprendi conversazione" : "Pausa conversazione"}
              >
                {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
              </Button>
              
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  {isPaused ? '⏸️ Conversazione in Pausa' : '▶️ Conversazione Attiva'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {isPaused 
                    ? 'Nessuno può inviare messaggi' 
                    : 'Gli AI possono rispondere'}
                </span>
              </div>
            </div>
          </div>

          {/* Controlli Microfono e Interrupt */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Conditional Audio Recorder */}
            {audioMode === 'stable' && (
              <BarVoiceRecorder
                conversationId={conversationId}
                onTranscriptionComplete={onTranscriptionComplete}
                isDisabled={isAISpeaking || isPaused}
              />
            )}
            
            {audioMode === 'v2_continuous' && (
              <BarVoiceRecorderV2_Continuous
                conversationId={conversationId}
                onTranscriptionComplete={onTranscriptionComplete}
                isDisabled={isAISpeaking || isPaused}
              />
            )}
            
            {audioMode === 'v2_extended' && (
              <BarVoiceRecorderV2_Extended
                conversationId={conversationId}
                onTranscriptionComplete={onTranscriptionComplete}
                isDisabled={isAISpeaking || isPaused}
              />
            )}
            
            {audioMode === 'v2_hybrid' && (
              <BarVoiceRecorderV2_Hybrid
                conversationId={conversationId}
                onTranscriptionComplete={onTranscriptionComplete}
                isDisabled={isAISpeaking || isPaused}
              />
            )}

            {/* Interrupt Button */}
            <InterruptButton
              isAISpeaking={isAISpeaking}
              onInterrupt={onInterrupt}
            />
          </div>

          {/* Dropdown Modalità Audio */}
          <div className="flex items-center gap-3 p-3 bg-muted/10 rounded-lg border border-border/20">
            <select
              value={audioMode}
              onChange={(e) => {
                const newMode = e.target.value as any;
                setAudioMode(newMode);
                if (conversationId) {
                  localStorage.setItem(`audio-mode-${conversationId}`, newMode);
                }
              }}
              className="flex-1 px-3 py-2 bg-background border border-input rounded-md text-sm"
            >
              <option value="stable">✅ STABLE (PTT 3s)</option>
              <option value="v2_continuous">🔵 Continuous (1.5s)</option>
              <option value="v2_extended">🟢 Extended (Hold)</option>
              <option value="v2_hybrid">🟡 Hybrid (Listen)</option>
            </select>
          </div>
        </div>
      )
    },
    {
      value: 'turns',
      label: 'Strategia Turni',
      icon: Brain,
      content: (
        <div className="space-y-4 max-h-[40vh] overflow-y-auto p-4">
          {/* Turn Strategy Toggle */}
          <div className="flex items-center justify-between p-3 bg-muted/10 rounded-lg border border-border/20">
            <div className="flex items-center gap-3">
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
            <div className="flex items-center gap-3">
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
          <div className="space-y-2 p-3 bg-muted/10 rounded-lg border border-border/20">
            <Label className="text-sm font-medium">
              Pausa tra turni: {pauseBetweenTurns}ms
            </Label>
            <Slider
              value={[pauseBetweenTurns]}
              onValueChange={(values) => updatePauseBetweenTurns(values[0])}
              min={400}
              max={2000}
              step={100}
              className="w-full"
              disabled={!conversationId}
            />
            <p className="text-xs text-muted-foreground">
              Tempo di attesa tra le risposte degli AI
            </p>
          </div>

          {/* Direct Call Detection Switch */}
          <div className="flex items-center justify-between p-3 bg-muted/10 rounded-lg border border-border/20">
            <div className="flex flex-col gap-1">
              <Label className="text-sm font-medium">
                Chiamate dirette (@nome)
              </Label>
              <p className="text-xs text-muted-foreground">
                Permette di menzionare un AI specifico
              </p>
            </div>
            <Switch
              checked={enableDirectCall}
              onCheckedChange={updateDirectCallDetection}
              disabled={!conversationId}
            />
          </div>
        </div>
      )
    },
    {
      value: 'test',
      label: 'Test Audio',
      icon: Beaker,
      badge: '🧪',
      content: (
        <div className="space-y-4 max-h-[40vh] overflow-y-auto p-4">
          {/* Audio Mode Selector */}
          <div className="space-y-3 p-3 bg-muted/10 rounded-lg border border-border/20">
            <Label className="text-sm font-medium">
              🧪 Seleziona Modalità Audio Sperimentale
            </Label>
            <select
              value={audioMode}
              onChange={(e) => {
                const newMode = e.target.value as any;
                setAudioMode(newMode);
                if (conversationId) {
                  localStorage.setItem(`audio-mode-${conversationId}`, newMode);
                }
              }}
              className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm"
            >
              <option value="stable">✅ STABLE (PTT 3s)</option>
              <option value="v2_continuous">🔵 Continuous (1.5s)</option>
              <option value="v2_extended">🟢 Extended (Hold)</option>
              <option value="v2_hybrid">🟡 Hybrid (Listen)</option>
            </select>
          </div>

          {/* Descrizione modalità selezionata */}
          <div className="p-4 bg-muted/20 rounded-lg border border-border/40">
            <h4 className="text-sm font-medium mb-2">
              {audioMode === 'stable' && '✅ STABLE - Push-to-Talk con silenzio 3s'}
              {audioMode === 'v2_continuous' && '🔵 CONTINUOUS - Auto-stop dopo 1.5s silenzio'}
              {audioMode === 'v2_extended' && '🟢 EXTENDED - Hold continuo'}
              {audioMode === 'v2_hybrid' && '🟡 HYBRID - Ascolto intelligente'}
            </h4>
            <p className="text-xs text-muted-foreground">
              {audioMode === 'stable' && 'Premi e rilascia. Registra per max 3 secondi di silenzio.'}
              {audioMode === 'v2_continuous' && 'Registrazione continua fino a 1.5 secondi di silenzio.'}
              {audioMode === 'v2_extended' && 'Tieni premuto per registrare, rilascia per fermare.'}
              {audioMode === 'v2_hybrid' && 'Ascolto intelligente con rilevamento automatico del silenzio.'}
            </p>
          </div>

          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              ⚠️ <strong>Modalità sperimentali:</strong> Queste varianti sono in fase di test e potrebbero non funzionare come previsto.
            </p>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className={cn("w-full border-2 border-red-500", className)}>
      <DynamicTabs 
        tabs={tabs} 
        defaultValue="audio" 
        variant="pills"
      />
    </div>
  );
};
