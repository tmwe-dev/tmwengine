import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UserPresence {
  user_id: string;
  online_at: string;
  status: 'online' | 'away' | 'busy';
}

export const useIntranetPresence = (roomId: string) => {
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [channel, setChannel] = useState<any>(null);

  useEffect(() => {
    if (!roomId) return;

    const presenceChannel = supabase.channel(`intranet-room-${roomId}`);

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const users: UserPresence[] = [];
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            if (presence.user_id && presence.online_at && presence.status) {
              users.push(presence as UserPresence);
            }
          });
        });
        setOnlineUsers(users);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await presenceChannel.track({
              user_id: user.id,
              online_at: new Date().toISOString(),
              status: 'online'
            });
          }
        }
      });

    setChannel(presenceChannel);

    return () => {
      presenceChannel.unsubscribe();
    };
  }, [roomId]);

  const updateStatus = async (status: 'online' | 'away' | 'busy') => {
    if (channel) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await channel.track({
          user_id: user.id,
          online_at: new Date().toISOString(),
          status
        });
      }
    }
  };

  return { onlineUsers, updateStatus };
};
