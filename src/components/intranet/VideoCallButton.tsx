import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Video } from 'lucide-react';
import { VideoCallDialog } from './VideoCallDialog';
import { supabase } from '@/integrations/supabase/client';

interface VideoCallButtonProps {
  roomId: string;
  roomName: string;
  disabled?: boolean;
}

export const VideoCallButton = ({ roomId, roomName, disabled }: VideoCallButtonProps) => {
  const [videoCallOpen, setVideoCallOpen] = useState(false);
  const [userDisplayName, setUserDisplayName] = useState('User');

  useEffect(() => {
    const loadUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .single();

      if (data?.display_name) {
        setUserDisplayName(data.display_name);
      }
    };

    loadUserProfile();
  }, []);

  const handleStartCall = async () => {
    setVideoCallOpen(true);
    
    // Broadcast notifica agli altri utenti della stanza
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const channel = supabase.channel(`room-${roomId}`);
      await channel.send({
        type: 'broadcast',
        event: 'video-call-started',
        payload: {
          roomId,
          roomName,
          startedBy: user.id,
          startedByName: userDisplayName,
          jitsiRoomName: `tmwengine-intranet-${roomId}`
        }
      });
    }
  };

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

      <VideoCallDialog
        isOpen={videoCallOpen}
        onClose={() => setVideoCallOpen(false)}
        roomId={roomId}
        roomName={roomName}
        userDisplayName={userDisplayName}
      />
    </>
  );
};
