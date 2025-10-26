import { RadioCarouselAudioPlayer } from './RadioCarouselAudioPlayer';
import { RadioMessage } from '@/types/radio';

interface RadioCarouselAudioPlayerWrapperProps {
  messages: RadioMessage[];
  activeMessageId: string;
  onAudioEnd: () => void;
}

export const RadioCarouselAudioPlayerWrapper = (props: RadioCarouselAudioPlayerWrapperProps) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-purple-400/30 bg-gradient-to-b from-black/95 to-black/98 shadow-[0_-4px_20px_rgba(168,85,247,0.15)]">
      <RadioCarouselAudioPlayer {...props} />
    </div>
  );
};
