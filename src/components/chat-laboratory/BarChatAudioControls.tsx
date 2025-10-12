import { useState } from 'react';
import { BarVoiceRecorder } from './BarVoiceRecorder';
import { BarFullDuplexRecorder } from './BarFullDuplexRecorder';
import { InterruptButton } from './InterruptButton';
import { MicrophoneTest } from './MicrophoneTest';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { TestTube2 } from 'lucide-react';
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
      "p-6 rounded-lg shadow-lg space-y-4",
      className
    )}>
      {/* Header con Switch e Test Microfono */}
      <div className="flex items-center justify-between gap-4 pb-3 border-b border-border/30">
        <div className="flex items-center gap-3">
          <Label 
            htmlFor="duplex-mode" 
            className={cn(
              "text-sm font-medium cursor-pointer transition-colors",
              !isDuplexMode ? "text-foreground" : "text-muted-foreground"
            )}
          >
            Premi per parlare
          </Label>
          <Switch
            id="duplex-mode"
            checked={isDuplexMode}
            onCheckedChange={setIsDuplexMode}
          />
          <Label 
            htmlFor="duplex-mode" 
            className={cn(
              "text-sm font-medium cursor-pointer transition-colors",
              isDuplexMode ? "text-foreground" : "text-muted-foreground"
            )}
          >
            Full-Duplex
          </Label>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <TestTube2 className="h-4 w-4 mr-2" />
              Test
            </Button>
          </DialogTrigger>
          <DialogContent>
            <MicrophoneTest />
          </DialogContent>
        </Dialog>
      </div>

      {/* Controlli audio centrali */}
      <div className="flex items-center justify-center gap-4">
        {/* Recorder (PTT o Full-Duplex) */}
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

        {/* Interrupt Button - visibile solo quando AI parla */}
        <InterruptButton
          isAISpeaking={isAISpeaking}
          onInterrupt={onInterrupt}
        />
      </div>

      {/* Descrizione modalità - compatta */}
      <div className="text-center text-xs text-muted-foreground">
        {isDuplexMode ? (
          <p>
            ✅ <strong>Microfono sempre attivo</strong> dopo il click. Sistema con AEC e VAD. Parla liberamente.
          </p>
        ) : (
          <p>
            ✅ <strong>Premi per parlare</strong>. Registra fino a 3 sec di silenzio.
          </p>
        )}
      </div>
    </div>
  );
};
