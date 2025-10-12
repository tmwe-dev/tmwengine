import { useState } from 'react';
import { BarVoiceRecorder } from './BarVoiceRecorder';
import { BarFullDuplexRecorder } from './BarFullDuplexRecorder';
import { InterruptButton } from './InterruptButton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

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
  const [isDuplexMode, setIsDuplexMode] = useState(false);

  return (
    <div className={cn(
      "border-t border-border/40 backdrop-blur-xl bg-background/80",
      "p-4 rounded-lg shadow-lg",
      className
    )}>
      {/* Switch PTT / Full-Duplex */}
      <div className="max-w-3xl mx-auto mb-4 flex items-center justify-center gap-3 pb-3 border-b border-border/30">
        <Label htmlFor="duplex-mode" className="text-sm font-medium cursor-pointer">
          {isDuplexMode ? '🎙️ Full-Duplex' : '🍺 Push-To-Talk'}
        </Label>
        <Switch
          id="duplex-mode"
          checked={isDuplexMode}
          onCheckedChange={setIsDuplexMode}
        />
      </div>

      <div className="max-w-3xl mx-auto flex items-center justify-center gap-8">
        {/* Voice Recorder - PTT o Full-Duplex */}
        {isDuplexMode ? (
          <BarFullDuplexRecorder
            conversationId={conversationId}
            onTranscriptionComplete={onTranscriptionComplete}
            isDisabled={false}
            isAISpeaking={isAISpeaking}
          />
        ) : (
          <BarVoiceRecorder
            conversationId={conversationId}
            onTranscriptionComplete={onTranscriptionComplete}
            isDisabled={isAISpeaking}
          />
        )}

        {/* Interrupt Button */}
        <InterruptButton
          isAISpeaking={isAISpeaking}
          onInterrupt={onInterrupt}
        />
      </div>

      {/* Mode Description */}
      <div className="max-w-3xl mx-auto mt-3 pt-3 border-t border-border/20 text-xs text-muted-foreground text-center">
        {isDuplexMode ? (
          <p>
            ✅ <strong>Microfono sempre attivo</strong> dopo click. Sistema con AEC e VAD. Parla liberamente.
          </p>
        ) : (
          <p>
            ✅ <strong>Premi 🍺 per parlare</strong>. Registra fino a 3 sec di silenzio.
          </p>
        )}
      </div>

      {/* Visual feedback banner */}
      {isAISpeaking && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 animate-pulse" />
      )}
    </div>
  );
};
