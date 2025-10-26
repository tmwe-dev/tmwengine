import { RadioAudioPlayer } from './RadioAudioPlayer';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface RadioAudioPlayerPopupProps {
  audioUrl: string;
  messageId: string;
  autoPlay?: boolean;
  canAutoPlay?: boolean;
  onPlayStart?: (messageId: string) => void;
  onPlayEnd?: () => void;
  onPlayingChange?: (isPlaying: boolean) => void;
  isAudioEnabled?: boolean;
}

export const RadioAudioPlayerPopup = (props: RadioAudioPlayerPopupProps) => {
  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent 
        className="fixed bottom-4 left-1/2 -translate-x-1/2 max-w-2xl w-[90%] border border-purple-400/30 bg-black/95 backdrop-blur-lg rounded-xl p-0 m-0 [&>button]:hidden"
      >
        <RadioAudioPlayer {...props} />
      </DialogContent>
    </Dialog>
  );
};
