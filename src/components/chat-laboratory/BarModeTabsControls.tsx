import { useState, useEffect } from 'react';
import { DynamicTabs, TabItem } from '@/components/design-system';
import { BarVoiceRecorder } from './BarVoiceRecorder';
import { BarVoiceRecorderV2_Hybrid } from './BarVoiceRecorderV2_Hybrid';
import { InterruptButton } from './InterruptButton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Pause, Play, Brain, Zap, Mic, Beaker, Phone } from 'lucide-react';
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
  const [audioMode, setAudioMode] = useState<'stable' | 'v2_hybrid'>('stable');

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
        setPauseBetweenTurns(data.pause_between_turns_ms || 1000);
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
          {/* Controlli Interrupt */}
          <div className="flex items-center gap-4">
            <InterruptButton
              isAISpeaking={isAISpeaking}
              onInterrupt={onInterrupt}
            />
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
          {/* Turn Strategy + Pause Slider - Allineati a destra */}
          <div className="flex items-center justify-end gap-3 p-2">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <Switch
              checked={isSmartMode}
              onCheckedChange={(checked) => 
                updateTurnStrategy(checked ? 'SMART_PRIORITY' : 'RANDOM_30')
              }
              disabled={!conversationId}
            />
            <div className="h-4 w-px bg-border" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">{pauseBetweenTurns}ms</span>
            <Slider
              value={[pauseBetweenTurns]}
              onValueChange={(values) => updatePauseBetweenTurns(values[0])}
              min={400}
              max={2000}
              step={100}
              className="w-20 max-w-[80px]"
              disabled={!conversationId}
            />
          </div>

          {/* Direct Call Detection - Compatto */}
          <div className="flex items-center justify-end gap-2 p-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
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
      label: 'Laboratorio Audio',
      icon: Beaker,
      badge: '🧪',
      content: (
        <div className="space-y-4 max-h-[40vh] overflow-y-auto p-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 mb-4">
            <p className="text-xs text-blue-800 dark:text-blue-200">
              <strong>Laboratorio:</strong> Testa i microfoni disponibili.
            </p>
          </div>

          {/* Grid con microfoni */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* PTT */}
            <div className="p-4 bg-muted/10 rounded-lg border border-border/20 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold">✅ PTT</h4>
                <span className="text-xs text-muted-foreground">VAD Configurabile</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Premi e rilascia. Auto-stop configurabile 1-5s.</p>
              <BarVoiceRecorder
                conversationId={conversationId}
                onTranscriptionComplete={(text) => {
                  console.log('🎤 PTT:', text);
                  onTranscriptionComplete(text);
                }}
                isDisabled={isAISpeaking || isPaused}
                vadTimeout={2}
              />
            </div>

            {/* HYBRID */}
            <div className="p-4 bg-muted/10 rounded-lg border border-border/20 space-y-2 opacity-50">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold">🟡 HYBRID</h4>
                <span className="text-xs text-muted-foreground">Coming Soon</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Ascolto continuo intelligente - In sviluppo.</p>
              <BarVoiceRecorderV2_Hybrid
                conversationId={conversationId}
                onTranscriptionComplete={(text) => {
                  console.log('🎤 HYBRID:', text);
                  onTranscriptionComplete(text);
                }}
                isDisabled={true}
              />
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className={cn("w-full flex items-center gap-2", className)}>
      <div className="flex-1">
        <DynamicTabs 
          tabs={tabs} 
          defaultValue="audio" 
          variant="pills"
        />
      </div>
      
      {/* Controlli a destra: Pausa + Microfono */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Icona Pausa */}
        <Button
          variant="ghost"
          size="icon"
          onClick={togglePause}
          className={cn(
            "h-8 w-8 rounded-full transition-all",
            isPaused && "bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30"
          )}
          title={isPaused ? "Riprendi conversazione" : "Pausa conversazione"}
        >
          {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        </Button>
        
        {/* Microfono attivo (solo icona) */}
        <div className="flex items-center">
          {audioMode === 'stable' && (
            <BarVoiceRecorder
              conversationId={conversationId}
              onTranscriptionComplete={onTranscriptionComplete}
              isDisabled={isAISpeaking || isPaused}
              vadTimeout={2}
            />
          )}
          
          {audioMode === 'v2_hybrid' && (
            <BarVoiceRecorderV2_Hybrid
              conversationId={conversationId}
              onTranscriptionComplete={onTranscriptionComplete}
              isDisabled={isAISpeaking || isPaused}
            />
          )}
        </div>
      </div>
    </div>
  );
};
