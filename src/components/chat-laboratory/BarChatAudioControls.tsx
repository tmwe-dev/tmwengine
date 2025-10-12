import { BarVoiceRecorder } from './BarVoiceRecorder';
import { InterruptButton } from './InterruptButton';
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
  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-50",
      "border-t border-border/40 backdrop-blur-xl bg-background/80",
      "p-4 shadow-lg",
      className
    )}>
      <div className="max-w-3xl mx-auto flex items-center justify-center gap-8">
        {/* Beer Voice Recorder */}
        <BarVoiceRecorder
          conversationId={conversationId}
          onTranscriptionComplete={onTranscriptionComplete}
          isDisabled={isAISpeaking}
        />

        {/* Interrupt Button */}
        <InterruptButton
          isAISpeaking={isAISpeaking}
          onInterrupt={onInterrupt}
        />
      </div>

      {/* Visual feedback banner */}
      {isAISpeaking && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 animate-pulse" />
      )}
    </div>
  );
};
