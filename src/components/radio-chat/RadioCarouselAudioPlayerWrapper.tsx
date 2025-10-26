import { RadioCarouselAudioPlayer } from './RadioCarouselAudioPlayer';
import { RadioMessage } from '@/types/radio';

interface RadioCarouselAudioPlayerWrapperProps {
  messages: RadioMessage[];
  activeMessageId: string;
  onAudioEnd: () => void;
}

export const RadioCarouselAudioPlayerWrapper = (props: RadioCarouselAudioPlayerWrapperProps) => {
  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 border-2 border-purple-400/40 bg-black/95 backdrop-blur-lg rounded-xl shadow-[0_0_40px_rgba(168,85,247,0.3)]">
      <RadioCarouselAudioPlayer {...props} />
    </div>
  );
};
