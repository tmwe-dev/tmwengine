import { useState } from 'react';
import { RadioAudioPlayer } from './RadioAudioPlayer';
import { RadioMessage } from '@/types/radio';
import { cn } from '@/lib/utils';

interface RadioCarouselAudioPlayerWrapperProps {
  message: RadioMessage;
  onAudioEnd: () => void;
  className?: string;
  isAudioEnabled?: boolean;
}

export const RadioCarouselAudioPlayerWrapper = ({ 
  message,
  onAudioEnd,
  className,
  isAudioEnabled = true
}: RadioCarouselAudioPlayerWrapperProps) => {
  const [audioProgress, setAudioProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleTimeUpdate = (currentTime: number, duration: number) => {
    if (duration > 0) {
      setAudioProgress(currentTime / duration);
    }
  };

  const isHuman = message.sender_type === 'human';

  if (!message.audio_url) {
    console.log(`⏭️ [CarouselWrapper] Skipping audio player: no audio_url for ${message.sender_name}`);
    return null;
  }

  return (
    <div className={cn(
      "fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-2xl w-[45%] border-2 border-purple-400/40 bg-black/95 backdrop-blur-lg rounded-xl shadow-[0_0_40px_rgba(168,85,247,0.3)]",
      className
    )}>
      <RadioAudioPlayer
        audioUrl={message.audio_url || ''}
        messageId={message.id}
        senderName={message.sender_name}
        autoPlay={!isHuman}
        canAutoPlay={true}
        onPlayStart={(id) => console.log(`▶️ [Carousel] Audio START: ${id}`)}
        onPlayEnd={onAudioEnd}
        onPlayingChange={setIsPlaying}
        isAudioEnabled={isAudioEnabled}
        showProgress={true}
        showSenderName={true}
        onTimeUpdate={handleTimeUpdate}
      />
    </div>
  );
};
