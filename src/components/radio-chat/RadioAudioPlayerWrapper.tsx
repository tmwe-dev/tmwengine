import { RadioAudioPlayer } from './RadioAudioPlayer';

interface RadioAudioPlayerWrapperProps {
  audioUrl: string;
  messageId: string;
  autoPlay?: boolean;
  canAutoPlay?: boolean;
  onPlayStart?: (messageId: string) => void;
  onPlayEnd?: () => void;
  onPlayingChange?: (isPlaying: boolean) => void;
  isAudioEnabled?: boolean;
}

export const RadioAudioPlayerWrapper = (props: RadioAudioPlayerWrapperProps) => {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-2xl w-[90%] border-2 border-purple-400/40 bg-black/95 backdrop-blur-lg rounded-xl shadow-[0_0_30px_rgba(168,85,247,0.25)]">
      <RadioAudioPlayer {...props} />
    </div>
  );
};
