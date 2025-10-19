import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Video } from 'lucide-react';
import { VideoCallDialog } from './VideoCallDialog';
import { NativeVideoCallDialog } from './NativeVideoCallDialog';
import { supabase } from '@/integrations/supabase/client';

interface DirectVideoCallButtonProps {
  targetUserId: string;
  targetUserName: string;
  disabled?: boolean;
}

export const DirectVideoCallButton = ({ 
  targetUserId, 
  targetUserName, 
  disabled 
}: DirectVideoCallButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [useNativeWebRTC, setUseNativeWebRTC] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');

  useEffect(() => {
    const phoneConfig = localStorage.getItem('phone_config');
    if (phoneConfig) {
      const config = JSON.parse(phoneConfig);
      setUseNativeWebRTC(config.useNativeWebRTC || false);
    }

    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || '');
    });
  }, []);

  const handleStartCall = () => {
    setIsOpen(true);
  };

  const sortedIds = [currentUserId, targetUserId].sort();
  const uniqueRoomId = `direct-${sortedIds[0]}-${sortedIds[1]}`;

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        onClick={handleStartCall}
        disabled={disabled}
      >
        <Video className="h-4 w-4" />
      </Button>

      {useNativeWebRTC ? (
        <NativeVideoCallDialog
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          targetUserId={targetUserId}
          targetUserName={targetUserName}
          currentUserId={currentUserId}
          roomId={uniqueRoomId}
        />
      ) : (
        <VideoCallDialog
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          roomId={uniqueRoomId}
          roomName={`Chiamata con ${targetUserName}`}
          userDisplayName={currentUserId}
        />
      )}
    </>
  );
};
