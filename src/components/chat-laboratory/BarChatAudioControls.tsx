import { useState, useEffect } from 'react';
import { BarVoiceRecorder } from './BarVoiceRecorder';
import { BarFullDuplexRecorder } from './BarFullDuplexRecorder';
import { InterruptButton } from './InterruptButton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Mic, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

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
      {/* Switch centrato */}
      <div className="flex justify-center pb-3 border-b border-border/30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 sm:hidden text-muted-foreground" />
            <Label 
              htmlFor="duplex-mode" 
              className={cn(
                "text-sm font-medium cursor-pointer transition-colors hidden sm:inline",
                !isDuplexMode ? "text-foreground" : "text-muted-foreground"
              )}
            >
              Premi per parlare
            </Label>
          </div>
          <Switch
            id="duplex-mode"
            checked={isDuplexMode}
            onCheckedChange={setIsDuplexMode}
          />
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 sm:hidden text-muted-foreground" />
            <Label 
              htmlFor="duplex-mode" 
              className={cn(
                "text-sm font-medium cursor-pointer transition-colors hidden sm:inline",
                isDuplexMode ? "text-foreground" : "text-muted-foreground"
              )}
            >
              Full-Duplex
            </Label>
          </div>
        </div>
      </div>

      {/* Controlli audio centrati sotto lo switch */}
      <div className="flex justify-center items-center gap-4">
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

    </div>
  );
};
