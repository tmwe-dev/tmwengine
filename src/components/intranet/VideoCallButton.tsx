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
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    // STEP 2B: Usa canale globale sempre attivo invece di creare nuovo canale
    const globalChannel = supabase.channel('global-video-notifications');
    
    // Sottoscrivi, invia, e mantieni aperto per 5 secondi
    await globalChannel.subscribe();
    
    console.log('[VideoCallButton] Broadcasting video call notification to global channel');
    
    await globalChannel.send({
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
    
    // Unsubscribe dopo 5 secondi per dare tempo alla notifica di arrivare
    setTimeout(() => {
      globalChannel.unsubscribe();
    }, 5000);
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
