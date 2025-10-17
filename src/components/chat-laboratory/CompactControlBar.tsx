import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { DynamicTabs, TabItem } from '@/components/design-system';
import { InterruptButton } from './InterruptButton';
import { BarModeToggle } from './BarModeToggle';
import { AudioModeSelector } from './AudioModeSelector';
import { BarVoiceRecorder } from './BarVoiceRecorder';
import { BarVoiceRecorderV2_Continuous } from './BarVoiceRecorderV2_Continuous';
import { BarVoiceRecorderV2_Extended } from './BarVoiceRecorderV2_Extended';
import { BarVoiceRecorderV2_Hybrid } from './BarVoiceRecorderV2_Hybrid';
import { Pause, Play, Brain, Zap, Mic, Beaker, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CompactControlBarProps {
  conversationId: string | null;
  isBarMode: boolean;
  isAISpeaking: boolean;
  onToggleBarMode: (value: boolean) => void;
  onInterrupt: () => void;
  onTranscriptionComplete: (text: string) => void;
  className?: string;
  position?: 'top' | 'bottom';
}

export const CompactControlBar = ({
  conversationId,
  isBarMode,
  isAISpeaking,
  onToggleBarMode,
  onInterrupt,
  onTranscriptionComplete,
  className,
  position = 'bottom'
}: CompactControlBarProps) => {
  const [isPaused, setIsPaused] = useState(false);
  const [turnStrategy, setTurnStrategy] = useState<string>('RANDOM_30');
  const [pauseBetweenTurns, setPauseBetweenTurns] = useState<number>(800);
  const [enableDirectCall, setEnableDirectCall] = useState<boolean>(true);
  const [audioMode, setAudioMode] = useState<'stable' | 'v2_continuous' | 'v2_extended' | 'v2_hybrid'>('stable');

  useEffect(() => {
    if (conversationId && isBarMode) {
      loadPauseState();
      loadDynamicTurnSettings();
      loadAudioMode();
    }
  }, [conversationId, isBarMode]);

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
    setTurnStrategy(newStrategy); // Aggiorna immediatamente UI
    if (!conversationId) {
      localStorage.setItem('turn-strategy-pending', newStrategy);
      return;
    }
    try {
      const { error } = await supabase
        .from('chat_laboratory_bar_mode')
        .update({ turn_strategy: newStrategy })
        .eq('conversation_id', conversationId);
      if (error) throw error;
      toast.success("Strategia aggiornata", {
        description: `Ora usando: ${newStrategy === 'RANDOM_30' ? 'Random' : 'Smart Turn-Taking'}`
      });
    } catch (error) {
      console.error('Error updating turn strategy:', error);
      toast.error("Errore aggiornamento strategia");
      // Rollback su errore
      setTurnStrategy(newStrategy === 'RANDOM_30' ? 'SMART_PRIORITY' : 'RANDOM_30');
    }
  };

  const updatePauseBetweenTurns = async (newPause: number) => {
    setPauseBetweenTurns(newPause); // Aggiorna immediatamente UI
    if (!conversationId) {
      localStorage.setItem('pause-between-turns-pending', String(newPause));
      return;
    }
    try {
      const { error } = await supabase
        .from('chat_laboratory_bar_mode')
        .update({ pause_between_turns_ms: newPause })
        .eq('conversation_id', conversationId);
      if (error) throw error;
    } catch (error) {
      console.error('Error updating pause:', error);
      toast.error("Errore aggiornamento pausa");
    }
  };

  const updateDirectCallDetection = async (enabled: boolean) => {
    setEnableDirectCall(enabled); // Aggiorna immediatamente UI
    if (!conversationId) {
      localStorage.setItem('direct-call-pending', String(enabled));
      return;
    }
    try {
      const { error } = await supabase
        .from('chat_laboratory_bar_mode')
        .update({ enable_direct_call_detection: enabled })
        .eq('conversation_id', conversationId);
      if (error) throw error;
      toast.success(enabled ? "Chiamate dirette abilitate" : "Chiamate dirette disabilitate");
    } catch (error) {
      console.error('Error updating direct call detection:', error);
      toast.error("Errore aggiornamento chiamate dirette");
      // Rollback su errore
      setEnableDirectCall(!enabled);
    }
  };

  const togglePause = async () => {
    if (!conversationId) {
      toast.warning("Avvia una conversazione prima di mettere in pausa");
      return;
    }
    const newPauseState = !isPaused;
    setIsPaused(newPauseState); // Aggiorna immediatamente UI
    try {
      const { error } = await supabase
        .from('chat_laboratory_conversations')
        .update({ is_paused: newPauseState })
        .eq('id', conversationId);
      if (error) throw error;
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
      toast.error("Errore", { description: "Impossibile cambiare stato pausa" });
      // Rollback su errore
      setIsPaused(!newPauseState);
    }
  };

  const isSmartMode = turnStrategy !== 'RANDOM_30';

  const tabs: TabItem[] = [
    {
      value: 'audio',
      label: 'Audio',
      icon: Mic,
      content: (
        <div className="space-y-4 max-h-[40vh] overflow-y-auto p-4">
          <InterruptButton isAISpeaking={isAISpeaking} onInterrupt={onInterrupt} />
        </div>
      )
    },
    {
      value: 'turns',
      label: 'Turni',
      icon: Brain,
      content: (
        <div className="space-y-4 max-h-[40vh] overflow-y-auto p-4">
          {/* Stato Corrente */}
          <div className="p-3 bg-muted/30 rounded-lg border space-y-2">
            <h4 className="text-sm font-semibold mb-2">⚙️ Configurazione Attiva</h4>
            
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Modalità Audio:</span>
              <span className="font-medium uppercase">{audioMode.replace('v2_', '')}</span>
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">⚡ Smart Turn-Taking:</span>
              <span className={cn("font-medium", isSmartMode ? "text-green-500" : "text-orange-500")}>
                {isSmartMode ? "Attivo" : "Disattivo"}
              </span>
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">📞 Chiamate Dirette:</span>
              <span className={cn("font-medium", enableDirectCall ? "text-green-500" : "text-orange-500")}>
                {enableDirectCall ? "Abilitate" : "Disabilitate"}
              </span>
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Pausa tra Turni:</span>
              <span className="font-medium">{pauseBetweenTurns}ms</span>
            </div>
          </div>

          {/* Caratteristiche Microfono Attivo */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 space-y-2">
            <h4 className="text-sm font-semibold mb-2">🎤 Microfono: {audioMode.toUpperCase().replace('V2_', '')}</h4>
            
            {audioMode === 'stable' && (
              <>
                <p className="text-xs text-muted-foreground">
                  <strong>Modalità:</strong> Push-to-Talk con Auto-Stop
                </p>
                <p className="text-xs text-muted-foreground">
                  <strong>Funzionamento:</strong> Premi e rilascia. Si ferma automaticamente dopo 3s di silenzio.
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  <strong>✅ Risultato:</strong> Registrazione affidabile, nessun rumore di fondo.
                </p>
              </>
            )}
            
            {audioMode === 'v2_continuous' && (
              <>
                <p className="text-xs text-muted-foreground">
                  <strong>Modalità:</strong> Registrazione Continua
                </p>
                <p className="text-xs text-muted-foreground">
                  <strong>Funzionamento:</strong> Sempre attivo. Auto-stop dopo 1.5s di silenzio.
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  <strong>✅ Risultato:</strong> Conversazione naturale hands-free.
                </p>
              </>
            )}
            
            {audioMode === 'v2_extended' && (
              <>
                <p className="text-xs text-muted-foreground">
                  <strong>Modalità:</strong> Hold-to-Record
                </p>
                <p className="text-xs text-muted-foreground">
                  <strong>Funzionamento:</strong> Tieni premuto per registrare, rilascia per inviare.
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  <strong>✅ Risultato:</strong> Controllo totale sulla durata della registrazione.
                </p>
              </>
            )}
            
            {audioMode === 'v2_hybrid' && (
              <>
                <p className="text-xs text-muted-foreground">
                  <strong>Modalità:</strong> Ascolto Intelligente
                </p>
                <p className="text-xs text-muted-foreground">
                  <strong>Funzionamento:</strong> VAD automatico rileva quando parli e quando smetti.
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  <strong>✅ Risultato:</strong> Esperienza più naturale con rilevamento vocale avanzato.
                </p>
              </>
            )}
          </div>
        </div>
      )
    },
    {
      value: 'test',
      label: 'Lab',
      icon: Beaker,
      badge: '🧪',
      content: (
        <div className="space-y-4 max-h-[40vh] overflow-y-auto p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-muted/10 rounded-lg border border-border/20 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold">✅ STABLE</h4>
                <span className="text-xs text-muted-foreground">PTT 3s</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Premi e rilascia. Auto-stop dopo 3s silenzio.</p>
              <BarVoiceRecorder
                conversationId={conversationId}
                onTranscriptionComplete={onTranscriptionComplete}
                isDisabled={isAISpeaking || isPaused}
              />
            </div>
            <div className="p-4 bg-muted/10 rounded-lg border border-border/20 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold">🔵 CONTINUOUS</h4>
                <span className="text-xs text-muted-foreground">1.5s VAD</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Registrazione continua con auto-stop 1.5s silenzio.</p>
              <BarVoiceRecorderV2_Continuous
                conversationId={conversationId}
                onTranscriptionComplete={onTranscriptionComplete}
                isDisabled={isAISpeaking || isPaused}
              />
            </div>
            <div className="p-4 bg-muted/10 rounded-lg border border-border/20 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold">🟢 EXTENDED</h4>
                <span className="text-xs text-muted-foreground">Hold</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Tieni premuto per registrare, rilascia per inviare.</p>
              <BarVoiceRecorderV2_Extended
                conversationId={conversationId}
                onTranscriptionComplete={onTranscriptionComplete}
                isDisabled={isAISpeaking || isPaused}
              />
            </div>
            <div className="p-4 bg-muted/10 rounded-lg border border-border/20 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold">🟡 HYBRID</h4>
                <span className="text-xs text-muted-foreground">Smart Listen</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Ascolto continuo intelligente con VAD automatico.</p>
              <BarVoiceRecorderV2_Hybrid
                conversationId={conversationId}
                onTranscriptionComplete={onTranscriptionComplete}
                isDisabled={isAISpeaking || isPaused}
              />
            </div>
          </div>
        </div>
      )
    }
  ];

  const Separator = () => <div className="h-4 w-px bg-border/40" />;

  // TOP: Solo InterruptButton, BarModeToggle, AudioModeSelector
  if (position === 'top') {
    return (
      <div className={cn("flex items-center gap-1.5 px-2 py-1 bg-muted/20 rounded-md border", className)}>
        {/* Interrupt Button */}
        {isBarMode && isAISpeaking && (
          <>
            <InterruptButton isAISpeaking={isAISpeaking} onInterrupt={onInterrupt} />
            <Separator />
          </>
        )}

        {/* Bar Mode Toggle */}
        <BarModeToggle
          conversationId={conversationId}
          isBarMode={isBarMode}
          onToggle={onToggleBarMode}
        />

        {isBarMode && (
          <>
            <Separator />
            
            {/* Audio Mode Selector */}
            <AudioModeSelector 
              conversationId={conversationId}
              onTranscriptionComplete={onTranscriptionComplete}
              isAISpeaking={isAISpeaking}
            />
          </>
        )}
      </div>
    );
  }

  // BOTTOM: Tutti gli altri elementi (solo se isBarMode è attivo)
  if (!isBarMode) return null;

  return (
    <div className={cn("flex items-center gap-1.5 px-2 py-1 bg-muted/20 rounded-md border", className)}>
      {/* Thunder Switch */}
      <Zap className="h-3.5 w-3.5 text-muted-foreground" />
      <Switch
        checked={isSmartMode}
        onCheckedChange={(checked) => 
          updateTurnStrategy(checked ? 'SMART_PRIORITY' : 'RANDOM_30')
        }
      />
      
      <Separator />
      
      {/* Phone Switch */}
      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
      <Switch
        checked={enableDirectCall}
        onCheckedChange={updateDirectCallDetection}
      />
      
      <Separator />
      
      {/* Pause Slider */}
      <Slider
        value={[pauseBetweenTurns]}
        onValueChange={(values) => updatePauseBetweenTurns(values[0])}
        min={400}
        max={2000}
        step={100}
        className="w-20 max-w-[80px]"
      />
      <span className="text-[10px] text-muted-foreground whitespace-nowrap min-w-[40px]">
        {pauseBetweenTurns}ms
      </span>
      
      <Separator />
      
      {/* Tabs */}
      <div className="flex-1">
        <DynamicTabs tabs={tabs} defaultValue="audio" variant="pills" />
      </div>
      
      <Separator />
      
      {/* Pause/Play Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={togglePause}
        className={cn(
          "h-7 w-7 rounded-full transition-all shrink-0",
          isPaused && "bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30"
        )}
        title={isPaused ? "Riprendi conversazione" : "Pausa conversazione"}
      >
        {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
      </Button>
      
      <Separator />
      
      {/* Active Microphone */}
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
  );
};
