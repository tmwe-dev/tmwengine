import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VideoCallPayload {
  roomId: string;
  roomName: string;
  startedBy: string;
  startedByName: string;
  jitsiRoomName: string;
}

export const useVideoCallNotifications = (roomId: string | null | undefined, currentUserId: string | null) => {
  const { toast } = useToast();

  useEffect(() => {
    if (!currentUserId) return;

    // STEP 2B: Ascolta canale globale sempre attivo
    const channel = supabase.channel('global-video-notifications');
    
    console.log('[VideoCallNotifications] Subscribing to global video notifications channel');
    
    channel
      .on('broadcast', { event: 'video-call-started' }, ({ payload }: { payload: VideoCallPayload }) => {
        console.log('[VideoCallNotifications] Received video call notification:', payload);
        
        // Ignora le proprie notifiche
        if (payload.startedBy === currentUserId) return;
        
        // Mostra toast solo se siamo nella stessa room
        if (payload.roomId === roomId) {
          toast({
            title: '📞 Videochiamata in corso',
            description: `${payload.startedByName} ha avviato una chiamata in ${payload.roomName}. Clicca il pulsante VideoCall per unirti.`,
            duration: 10000,
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, currentUserId, toast]);
};
