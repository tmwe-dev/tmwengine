import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNotificationSound } from './useNotificationSound';
import { toast } from '@/hooks/use-toast';

interface UnreadCount {
  roomId: string;
  count: number;
}

interface IntranetNotificationsConfig {
  enableSound: boolean;
  enableToast: boolean;
  soundVolume?: number;
}

export const useIntranetNotifications = (
  currentUserId: string | undefined,
  currentRoomId: string | undefined,
  config: IntranetNotificationsConfig = {
    enableSound: true,
    enableToast: true,
    soundVolume: 0.5
  }
) => {
  const [unreadCounts, setUnreadCounts] = useState<UnreadCount[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const { playSound } = useNotificationSound({ 
    enabled: config.enableSound, 
    volume: config.soundVolume || 0.5 
  });

  // Carica i conteggi non letti
  const loadUnreadCounts = useCallback(async () => {
    if (!currentUserId) return;

    try {
      // Ottieni tutte le stanze dell'utente
      const { data: rooms } = await supabase
        .from('intranet_room_members')
        .select('room_id')
        .eq('user_id', currentUserId);

      if (!rooms) return;

      const counts: UnreadCount[] = [];
      
      for (const room of rooms) {
        const { data, error } = await supabase
          .rpc('get_unread_messages_count', {
            p_user_id: currentUserId,
            p_room_id: room.room_id
          });

        if (!error && data !== null) {
          counts.push({
            roomId: room.room_id,
            count: data
          });
        }
      }

      setUnreadCounts(counts);
      setTotalUnread(counts.reduce((sum, c) => sum + c.count, 0));
    } catch (error) {
      console.error('Error loading unread counts:', error);
    }
  }, [currentUserId]);

  // Marca come letto quando si entra in una stanza
  const markAsRead = useCallback(async (roomId: string) => {
    if (!currentUserId) return;

    try {
      const { error } = await supabase
        .from('intranet_user_room_status')
        .upsert({
          user_id: currentUserId,
          room_id: roomId,
          last_read_at: new Date().toISOString()
        });

      if (!error) {
        // Aggiorna i conteggi localmente
        setUnreadCounts(prev => 
          prev.map(c => c.roomId === roomId ? { ...c, count: 0 } : c)
        );
        await loadUnreadCounts();
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }, [currentUserId, loadUnreadCounts]);

  // Carica conteggi all'avvio
  useEffect(() => {
    loadUnreadCounts();
  }, [loadUnreadCounts]);

  // Marca come letto quando si cambia stanza
  useEffect(() => {
    if (currentRoomId) {
      markAsRead(currentRoomId);
    }
  }, [currentRoomId, markAsRead]);

  // Ascolta nuovi messaggi in real-time
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel('intranet-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'intranet_messages'
        },
        async (payload: any) => {
          const newMessage = payload.new;
          
          // Non notificare i propri messaggi
          if (newMessage.user_id === currentUserId) return;
          
          // Ottieni info sulla stanza
          const { data: room } = await supabase
            .from('intranet_rooms')
            .select('name, is_private')
            .eq('id', newMessage.room_id)
            .single();

          // Verifica se l'utente è membro della stanza
          const { data: isMember } = await supabase
            .from('intranet_room_members')
            .select('id')
            .eq('room_id', newMessage.room_id)
            .eq('user_id', currentUserId)
            .single();

          if (!isMember) return;

          // Ottieni info sull'utente che ha inviato
          const { data: sender } = await supabase
            .from('user_profiles')
            .select('display_name')
            .eq('user_id', newMessage.user_id)
            .single();

          // Suona solo se non sei nella stanza corrente
          if (newMessage.room_id !== currentRoomId && config.enableSound) {
            playSound(room?.is_private ? 'private-chat' : 'message');
          }

          // Toast per chat private o se non sei nella stanza
          if (config.enableToast && (room?.is_private || newMessage.room_id !== currentRoomId)) {
            toast({
              title: room?.is_private ? '💬 Nuova chat privata' : `💬 ${room?.name || 'Nuovo messaggio'}`,
              description: `${sender?.display_name || 'Qualcuno'}: ${newMessage.content.substring(0, 50)}${newMessage.content.length > 50 ? '...' : ''}`,
              duration: 4000,
            });
          }

          // 🔔 Invia Push Notification se l'utente non è nella room corrente
          if (newMessage.room_id !== currentRoomId) {
            console.log('[IntranetNotifications] 🔔 Sending push notification for message in different room');
            supabase.functions.invoke('send-push-notification', {
              body: {
                userId: currentUserId,
                title: `📩 ${sender?.display_name || 'Qualcuno'} in ${room?.name || 'Chat'}`,
                body: newMessage.content.substring(0, 100),
                url: `/intranet?room=${newMessage.room_id}`
              }
            }).catch(err => {
              console.warn('[IntranetNotifications] ⚠️ Push notification failed:', err);
            });
          }

          // Ricarica conteggi
          await loadUnreadCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, currentRoomId, config.enableSound, config.enableToast, playSound, loadUnreadCounts]);

  const getUnreadCount = useCallback((roomId: string): number => {
    return unreadCounts.find(c => c.roomId === roomId)?.count || 0;
  }, [unreadCounts]);

  return {
    unreadCounts,
    totalUnread,
    getUnreadCount,
    markAsRead,
    refreshCounts: loadUnreadCounts
  };
};
