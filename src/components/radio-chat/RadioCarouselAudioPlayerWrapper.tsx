import { useState, useEffect } from 'react';
import { RadioAudioPlayer } from './RadioAudioPlayer';
import { RadioAudioPlayerMini } from './RadioAudioPlayerMini';
import { RadioMessage } from '@/types/radio';
import { cn } from '@/lib/utils';
import { Minimize2 } from 'lucide-react';
import { useRadioAudioPlayer } from '@/contexts/RadioAudioPlayerContext';

interface RadioCarouselAudioPlayerWrapperProps {
  message: RadioMessage;
  onAudioEnd: () => void;
  className?: string;
  isAudioEnabled?: boolean;
  /** Shared ref for centralized audio control */
  sharedAudioRef?: React.MutableRefObject<HTMLAudioElement | null>;
  /** Whether audio is currently playing globally */
  isAudioPlaying?: boolean;
  /** Called when audio starts playing */
  onAudioStart?: (id: string) => void;
}

export const RadioCarouselAudioPlayerWrapper = ({ 
  message,
  onAudioEnd,
  className,
  isAudioEnabled = true,
  sharedAudioRef,
  isAudioPlaying = false,
  onAudioStart
}: RadioCarouselAudioPlayerWrapperProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const { setIsPlayerExpanded } = useRadioAudioPlayer();

  useEffect(() => {
    setIsPlayerExpanded(isExpanded);
  }, [isExpanded, setIsPlayerExpanded]);

  const handleTimeUpdate = (currentTime: number, duration: number) => {
    if (duration > 0) {
      setAudioProgress(currentTime / duration);
    }
  };

  const isHuman = message.sender_type === 'human';

  // Mini view (default)
  if (!isExpanded) {
    return (
      <RadioAudioPlayerMini
        audioUrl={message.audio_url!}
        messageId={message.id}
        onExpand={() => setIsExpanded(true)}
        isAudioEnabled={isAudioEnabled}
        isPlaying={isPlaying}
        onPlayingChange={setIsPlaying}
        audioProgress={audioProgress}
        onTimeUpdate={handleTimeUpdate}
        autoPlay={!isHuman}
        canAutoPlay={!isAudioPlaying}
        onPlayStart={(id) => { console.log(`▶️ [Carousel Mini] Audio START: ${id}`); onAudioStart?.(id); }}
        onPlayEnd={onAudioEnd}
        sharedAudioRef={sharedAudioRef}
      />
    );
  }

  // Expanded view
  return (
    <div className={cn(
      "max-h-[100px] w-full max-w-3xl border-2 border-purple-400/40 bg-black/95 backdrop-blur-lg rounded-xl shadow-[0_0_40px_rgba(168,85,247,0.3)] relative overflow-hidden",
      className
    )}>
      <button
        onClick={() => setIsExpanded(false)}
        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-purple-500/20 hover:bg-purple-500/30 flex items-center justify-center transition-all z-10"
        aria-label="Minimize player"
      >
        <Minimize2 className="w-4 h-4 text-purple-300" />
      </button>

      <RadioAudioPlayer
        audioUrl={message.audio_url!}
        messageId={message.id}
        senderName={message.sender_name}
        autoPlay={!isHuman}
        canAutoPlay={!isAudioPlaying}
        onPlayStart={(id) => { console.log(`▶️ [Carousel] Audio START: ${id}`); onAudioStart?.(id); }}
        onPlayEnd={onAudioEnd}
        onPlayingChange={setIsPlaying}
        isAudioEnabled={isAudioEnabled}
        showProgress={true}
        showSenderName={true}
        onTimeUpdate={handleTimeUpdate}
        sharedAudioRef={sharedAudioRef}
      />
    </div>
  );
};
