import { RadioAudioPlayerWrapper } from './RadioAudioPlayerWrapper';
import { RadioMessage } from '@/types/radio';

interface RadioMessageViewProps {
  message: RadioMessage;
  onAudioEnd: () => void;
  onAudioStart: (messageId: string) => void;
  isAudioEnabled?: boolean;
  canAutoPlay?: boolean;
  showAudioPlayer?: boolean;
}

export const RadioMessageView = ({ 
  message, 
  onAudioEnd,
  onAudioStart,
  isAudioEnabled = true,
  canAutoPlay = true,
  showAudioPlayer = true
}: RadioMessageViewProps) => {
  const isHuman = message.sender_type === 'human';
  
  return (
    <div className="p-4 md:p-6 max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto">
      <div className="mb-2">
        <div className={isHuman ? 'text-blue-400 font-medium' : 'text-green-400 font-medium'}>
          {message.sender_name}
        </div>
      </div>
      
      <div className="text-white/90 whitespace-pre-wrap mb-4 text-base md:text-lg lg:text-xl">
        {message.content}
      </div>
      
      {showAudioPlayer === true && message.audio_url && (
        <RadioAudioPlayerWrapper
          audioUrl={message.audio_url}
          messageId={message.id}
          autoPlay={!isHuman}
          canAutoPlay={canAutoPlay}
          onPlayStart={onAudioStart}
          onPlayEnd={onAudioEnd}
          isAudioEnabled={isAudioEnabled}
        />
      )}
    </div>
  );
};
