import { RadioCarouselAudioPlayer } from './RadioCarouselAudioPlayer';
import { RadioMessage } from '@/types/radio';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface RadioCarouselAudioPlayerPopupProps {
  messages: RadioMessage[];
  activeMessageId: string;
  onAudioEnd: () => void;
}

export const RadioCarouselAudioPlayerPopup = (props: RadioCarouselAudioPlayerPopupProps) => {
  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent 
        className="fixed bottom-0 left-0 right-0 max-w-none w-full border-0 border-t border-purple-400/20 bg-gradient-to-b from-black/95 to-black/98 backdrop-blur-lg rounded-none p-0 m-0 [&>button]:hidden"
      >
        <RadioCarouselAudioPlayer {...props} />
      </DialogContent>
    </Dialog>
  );
};
