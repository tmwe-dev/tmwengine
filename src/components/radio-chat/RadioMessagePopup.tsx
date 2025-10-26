import { X } from 'lucide-react';
import { RadioMessageView } from './RadioMessageView';
import { RadioMessage } from '@/types/radio';
import { FadeIn } from '../design-system/animations/FadeIn';

interface RadioMessagePopupProps {
  message: RadioMessage;
  onClose: () => void;
  onAudioEnd: () => void;
  onAudioStart: (messageId: string) => void;
  isAudioEnabled?: boolean;
  canAutoPlay?: boolean;
}

export const RadioMessagePopup = ({
  message,
  onClose,
  onAudioEnd,
  onAudioStart,
  isAudioEnabled = true,
  canAutoPlay = true
}: RadioMessagePopupProps) => {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Popup Content */}
      <FadeIn duration={0.2}>
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-2xl max-h-[80vh] bg-gradient-to-br from-gray-900 to-black border border-white/20 rounded-2xl shadow-2xl overflow-hidden">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Scrollable Content */}
          <div className="overflow-y-auto max-h-[80vh]">
            <RadioMessageView
              message={message}
              onAudioEnd={onAudioEnd}
              onAudioStart={onAudioStart}
              isAudioEnabled={isAudioEnabled}
              canAutoPlay={canAutoPlay}
              showAudioPlayer={true}
            />
          </div>
        </div>
      </FadeIn>
    </>
  );
};
