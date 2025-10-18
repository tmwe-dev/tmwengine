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
  const [audioMode, setAudioMode] = useState<'stable' | 'v2_continuous' | 'v2_extended' | 'v2_hybrid'>('stable');
  const [enableDirectCall, setEnableDirectCall] = useState(true);

  useEffect(() => {
    console.log('🎛️ BarModeTabsControls mounted:', { conversationId });
    if (conversationId) {
      loadPauseState();
      loadAudioMode();
      loadDirectCallDetection();
    }
  }, [conversationId]);

  const loadAudioMode = () => {
    if (!conversationId) return;
    const stored = localStorage.getItem(`audio-mode-${conversationId}`);
    if (stored) {
      setAudioMode(stored as any);
    }
  };

  const loadDirectCallDetection = async () => {
    if (!conversationId) return;
    try {
      const { data, error } = await supabase
        .from('chat_laboratory_bar_mode')
        .select('enable_direct_call_detection')
        .eq('conversation_id', conversationId)
        .single();
      if (error) throw error;
      setEnableDirectCall(data?.enable_direct_call_detection ?? true);
    } catch (error) {
      console.error('Error loading direct call detection:', error);
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

  const updateDirectCallDetection = async (enabled: boolean) => {
    if (!conversationId) return;
    setEnableDirectCall(enabled);
    try {
      const { error } = await supabase
        .from('chat_laboratory_bar_mode')
        .update({ enable_direct_call_detection: enabled })
        .eq('conversation_id', conversationId);
      if (error) throw error;
      toast.success(enabled ? "✅ Direct Call Detection attivo" : "⛔ Direct Call Detection disattivato");
    } catch (error) {
      console.error('Error updating direct call detection:', error);
      toast.error("Errore aggiornamento Direct Call Detection");
    }
  };

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

          {/* Direct Call Detection */}
          <div className="flex items-center justify-between p-3 bg-muted/10 rounded-lg border border-border/20">
            <div className="flex flex-col gap-1">
              <Label className="text-sm font-medium">🎯 Rileva Chiamate Dirette</Label>
              <span className="text-xs text-muted-foreground">
                Riconosce quando nomini un agente (es. "Marco, cosa ne pensi?")
              </span>
            </div>
            <Switch checked={enableDirectCall} onCheckedChange={updateDirectCallDetection} />
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
              <strong>Laboratorio di Comparazione:</strong> Testa tutte e 4 le modalità contemporaneamente per trovare quella più adatta.
            </p>
          </div>

          {/* Grid con 4 microfoni */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* STABLE */}
            <div className="p-4 bg-muted/10 rounded-lg border border-border/20 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold">✅ STABLE</h4>
                <span className="text-xs text-muted-foreground">PTT 3s</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Premi e rilascia. Auto-stop dopo 3s silenzio.</p>
              <BarVoiceRecorder
                conversationId={conversationId}
                onTranscriptionComplete={(text) => {
                  console.log('🎤 STABLE:', text);
                  onTranscriptionComplete(text);
                }}
                isDisabled={isAISpeaking || isPaused}
              />
            </div>

            {/* CONTINUOUS */}
            <div className="p-4 bg-muted/10 rounded-lg border border-border/20 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold">🔵 CONTINUOUS</h4>
                <span className="text-xs text-muted-foreground">1.5s VAD</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Registrazione continua con auto-stop 1.5s silenzio.</p>
              <BarVoiceRecorderV2_Continuous
                conversationId={conversationId}
                onTranscriptionComplete={(text) => {
                  console.log('🎤 CONTINUOUS:', text);
                  onTranscriptionComplete(text);
                }}
                isDisabled={isAISpeaking || isPaused}
              />
            </div>

            {/* EXTENDED */}
            <div className="p-4 bg-muted/10 rounded-lg border border-border/20 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold">🟢 EXTENDED</h4>
                <span className="text-xs text-muted-foreground">Hold</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Tieni premuto per registrare, rilascia per inviare.</p>
              <BarVoiceRecorderV2_Extended
                conversationId={conversationId}
                onTranscriptionComplete={(text) => {
                  console.log('🎤 EXTENDED:', text);
                  onTranscriptionComplete(text);
                }}
                isDisabled={isAISpeaking || isPaused}
              />
            </div>

            {/* HYBRID */}
            <div className="p-4 bg-muted/10 rounded-lg border border-border/20 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold">🟡 HYBRID</h4>
                <span className="text-xs text-muted-foreground">Smart Listen</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Ascolto continuo intelligente con VAD automatico.</p>
              <BarVoiceRecorderV2_Hybrid
                conversationId={conversationId}
                onTranscriptionComplete={(text) => {
                  console.log('🎤 HYBRID:', text);
                  onTranscriptionComplete(text);
                }}
                isDisabled={isAISpeaking || isPaused}
              />
            </div>
          </div>

          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              ⚠️ Le trascrizioni verranno loggiate in console per confronto. Ogni microfono funziona indipendentemente.
            </p>
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
        </div>
      </div>
    </div>
  );
};
