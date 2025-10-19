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
    if (!roomId || !currentUserId) return;

    const channel = supabase.channel(`room-${roomId}`);
    
    channel
      .on('broadcast', { event: 'video-call-started' }, ({ payload }: { payload: VideoCallPayload }) => {
        // Ignora le proprie notifiche
        if (payload.startedBy === currentUserId) return;
        
        toast({
          title: '📞 Videochiamata in corso',
          description: `${payload.startedByName} ha avviato una chiamata in ${payload.roomName}. Clicca il pulsante VideoCall per unirti.`,
          duration: 10000,
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, currentUserId, toast]);
};
