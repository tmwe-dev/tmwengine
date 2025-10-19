import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Video, X } from 'lucide-react';

interface VideoCallDialogProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  roomName: string;
  userDisplayName: string;
}

export const VideoCallDialog = ({
  isOpen,
  onClose,
  roomId,
  roomName,
  userDisplayName
}: VideoCallDialogProps) => {
  const jitsiRoomName = `tmwengine-intranet-${roomId}`;
  const jitsiUrl = `https://meet.jit.si/${jitsiRoomName}?config.prejoinPageEnabled=false&config.startWithVideoMuted=false&config.startWithAudioMuted=false&userInfo.displayName=${encodeURIComponent(userDisplayName)}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] h-[90vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              <DialogTitle>Video Call - {roomName}</DialogTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 relative">
          <iframe
            src={jitsiUrl}
            allow="camera; microphone; fullscreen; display-capture"
            className="w-full h-full border-0"
            title={`Video call for ${roomName}`}
          />
        </div>

        <div className="px-6 py-4 border-t flex justify-center">
          <Button variant="destructive" onClick={onClose}>
            Chiudi Chiamata
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
