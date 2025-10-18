import { useState, useEffect } from 'react';
import { BarVoiceRecorder } from './BarVoiceRecorder';
import { BarVoiceRecorderV2_Continuous } from './BarVoiceRecorderV2_Continuous';

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
  const [audioMode, setAudioMode] = useState<'stable' | 'v2_continuous' | 'v2_hybrid'>('stable');

  useEffect(() => {
    if (conversationId) {
      loadPauseState();
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

  return (
    <div className={cn(
      "border-t border-border/40 backdrop-blur-xl bg-background/80",
      "p-6 rounded-lg shadow-lg space-y-4",
      className
    )}>
      
      {/* 🆕 PAUSA - Sezione separata SOPRA tutto */}
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

      {/* Riga 1: Controlli principali */}
      <div className="flex justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          {/* Conditional Audio Recorder based on audioMode */}
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
          
          
          {audioMode === 'v2_hybrid' && (
            <BarVoiceRecorderV2_Hybrid
              conversationId={conversationId}
              onTranscriptionComplete={onTranscriptionComplete}
              isDisabled={isAISpeaking || isPaused}
            />
          )}

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
            
            <option value="v2_hybrid">🟡 Hybrid (Listen)</option>
          </select>
        </div>
      </div>

    </div>
  );
};
