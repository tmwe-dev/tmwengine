import { VideoCallButton } from './VideoCallButton';

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
}

interface TtsControlsProps {
  roomId?: string;
  roomName?: string;
}

export const TtsControls = ({ 
  roomId,
  roomName
}: TtsControlsProps) => {

  return (
    <div className="flex items-center justify-center gap-2 px-2 py-1 border-t border-border bg-muted/30">
      {/* Video Call Button */}
      {roomId && roomName && (
        <VideoCallButton 
          roomId={roomId} 
          roomName={roomName}
        />
      )}
    </div>
  );
};
