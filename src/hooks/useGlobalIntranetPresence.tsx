import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UserPresence {
  user_id: string;
  online_at: string;
  status: 'online' | 'away' | 'busy';
}

export const useGlobalIntranetPresence = () => {
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [channel, setChannel] = useState<any>(null);

  useEffect(() => {
    const presenceChannel = supabase.channel('intranet-global');

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
        console.log('📡 Global presence sync:', users.length, 'users online');
        setOnlineUsers(users);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('✅ User joined global:', key);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('❌ User left global:', key);
      })
      .subscribe(async (status) => {
        console.log('🔌 Global presence channel status:', status);
        if (status === 'SUBSCRIBED') {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await presenceChannel.track({
              user_id: user.id,
              online_at: new Date().toISOString(),
              status: 'online'
            });
            console.log('👤 Tracking user in global presence:', user.id);
          }
        }
      });

    setChannel(presenceChannel);

    return () => {
      console.log('🔌 Unsubscribing from global presence');
      presenceChannel.unsubscribe();
    };
  }, []);

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
