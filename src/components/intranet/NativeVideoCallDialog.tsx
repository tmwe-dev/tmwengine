import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Video, VideoOff, Mic, MicOff, PhoneOff } from 'lucide-react';
import { useVideoCall } from '@/hooks/useVideoCall';
import { useEffect } from 'react';

interface NativeVideoCallDialogProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: string;
  targetUserName: string;
  currentUserId: string;
  roomId: string;
  isIncoming?: boolean;
}

export const NativeVideoCallDialog = ({
  isOpen,
  onClose,
  targetUserId,
  targetUserName,
  currentUserId,
  roomId,
  isIncoming = false
}: NativeVideoCallDialogProps) => {
  const {
    isInCall,
    isMuted,
    isVideoOff,
    localVideoRef,
    remoteVideoRef,
    startCall,
    answerCall,
    endCall,
    toggleMute,
    toggleVideo
  } = useVideoCall(roomId, currentUserId);

  useEffect(() => {
    if (isOpen && !isInCall) {
      if (isIncoming) {
        console.log('[NativeVideoCallDialog] 📞 Answering incoming call from:', targetUserId);
        answerCall(targetUserId);
      } else {
        console.log('[NativeVideoCallDialog] 📞 Starting outgoing call to:', targetUserId);
        startCall(targetUserId);
      }
    }
  }, [isOpen, targetUserId, isIncoming, isInCall, answerCall, startCall]);

  const handleClose = () => {
    endCall();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] h-[90vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>📹 Videochiamata con {targetUserName}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 relative bg-black">
          {/* Video remoto (fullscreen) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />

          {/* Video locale (picture-in-picture) */}
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute top-4 right-4 w-48 h-36 rounded-lg border-2 border-white shadow-lg object-cover"
          />

          {/* Controlli */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3">
            <Button
              variant={isMuted ? 'destructive' : 'secondary'}
              size="icon"
              onClick={toggleMute}
              className="rounded-full w-12 h-12"
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>

            <Button
              variant={isVideoOff ? 'destructive' : 'secondary'}
              size="icon"
              onClick={toggleVideo}
              className="rounded-full w-12 h-12"
            >
              {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </Button>

            <Button
              variant="destructive"
              size="icon"
              onClick={handleClose}
              className="rounded-full w-14 h-14"
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
