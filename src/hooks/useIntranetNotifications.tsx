import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from './useUserProfile';
import { toast } from '@/hooks/use-toast';

interface Message {
  id: string;
  content: string;
  user_id: string;
  room_id: string;
  created_at: string;
  message_type: string;
}

interface Room {
  id: string;
  name: string;
  is_private: boolean;
}

interface UnreadCount {
  [roomId: string]: number;
}

export const useIntranetNotifications = (currentRoomId?: string) => {
  const { profile } = useUserProfile();
  const [unreadCounts, setUnreadCounts] = useState<UnreadCount>({});
  const lastMessageIdRef = useRef<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [totalUnread, setTotalUnread] = useState(0);

  // Inizializza AudioContext
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioContextRef.current = new AudioContext();
    }
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Funzione per riprodurre il suono di notifica
  const playNotificationSound = (isPrivateChat: boolean = false) => {
    if (!audioContextRef.current) return;

    const audioContext = audioContextRef.current;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Suono diverso per chat private
    oscillator.frequency.value = isPrivateChat ? 880 : 660; // A5 per private, E5 per normali
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  };

  // Aggiorna lo stato di lettura quando cambi stanza
  const markRoomAsRead = async (roomId: string) => {
    if (!profile?.userId) return;

    try {
      await supabase
        .from('intranet_user_room_status')
        .upsert({
          user_id: profile.userId,
          room_id: roomId,
          last_read_at: new Date().toISOString(),
        });

      // Aggiorna il contatore locale
      setUnreadCounts(prev => ({
        ...prev,
        [roomId]: 0,
      }));
    } catch (error) {
      console.error('Error marking room as read:', error);
    }
  };

  // Carica i contatori iniziali
  useEffect(() => {
    if (!profile?.userId) return;

    const loadUnreadCounts = async () => {
      try {
        // Ottieni tutte le stanze dell'utente
        const { data: rooms } = await supabase
          .from('intranet_room_members')
          .select('room_id, intranet_rooms(id, name, is_private)')
          .eq('user_id', profile.userId);

        if (!rooms) return;

        const counts: UnreadCount = {};
        let total = 0;

        for (const room of rooms) {
          const { data: count } = await supabase.rpc('get_unread_messages_count', {
            p_user_id: profile.userId,
            p_room_id: room.room_id,
          });

          const unreadCount = count || 0;
          counts[room.room_id] = unreadCount;
          total += unreadCount;
        }

        setUnreadCounts(counts);
        setTotalUnread(total);
      } catch (error) {
        console.error('Error loading unread counts:', error);
      }
    };

    loadUnreadCounts();
  }, [profile?.userId]);

  // Ascolta nuovi messaggi in real-time
  useEffect(() => {
    if (!profile?.userId) return;

    const channel = supabase
      .channel('intranet-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'intranet_messages',
        },
        async (payload) => {
          const newMessage = payload.new as Message;

          // Ignora i propri messaggi
          if (newMessage.user_id === profile.userId) return;

          // Ignora se è il messaggio già gestito
          if (newMessage.id === lastMessageIdRef.current) return;
          lastMessageIdRef.current = newMessage.id;

          // Ottieni info sulla stanza
          const { data: room } = await supabase
            .from('intranet_rooms')
            .select('name, is_private')
            .eq('id', newMessage.room_id)
            .single();

          // Se non è la stanza corrente, incrementa il contatore
          if (newMessage.room_id !== currentRoomId) {
            setUnreadCounts(prev => ({
              ...prev,
              [newMessage.room_id]: (prev[newMessage.room_id] || 0) + 1,
            }));
            setTotalUnread(prev => prev + 1);

            // Suono di notifica
            playNotificationSound(room?.is_private || false);

            // Toast per chat private
            if (room?.is_private) {
              toast({
                title: 'Nuova chat privata',
                description: `Nuovo messaggio in ${room.name}`,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.userId, currentRoomId]);

  // Marca come letta la stanza corrente quando cambia
  useEffect(() => {
    if (currentRoomId) {
      markRoomAsRead(currentRoomId);
    }
  }, [currentRoomId]);

  return {
    unreadCounts,
    totalUnread,
    markRoomAsRead,
  };
};
