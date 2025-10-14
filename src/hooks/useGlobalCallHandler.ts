import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

interface IncomingCall {
  from: string;
  callerName: string;
  roomId: string;
}

export const useGlobalCallHandler = (currentUserId: string) => {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!currentUserId) return;

    console.log('[GlobalCallHandler] Subscribing to call signals for:', currentUserId);

    // Sottoscrizione globale per tutte le chiamate dirette a questo utente
    const channel = supabase.channel(`user-calls-${currentUserId}`);

    channel
      .on('broadcast', { event: 'incoming-call' }, async ({ payload }) => {
        console.log('[GlobalCallHandler] Incoming call:', payload);

        if (payload.to !== currentUserId || payload.from === currentUserId) {
          console.log('[GlobalCallHandler] ❌ Ignored: self-call or wrong recipient');
          return;
        }

        // Recupera nome chiamante
        const { data: callerProfile } = await supabase
          .from('user_profiles')
          .select('display_name')
          .eq('user_id', payload.from)
          .single();

        setIncomingCall({
          from: payload.from,
          callerName: callerProfile?.display_name || 'Utente sconosciuto',
          roomId: payload.roomId
        });

        // Mostra anche toast per sicurezza
        toast({
          title: '📞 Chiamata in arrivo',
          description: `Da ${callerProfile?.display_name || 'Utente sconosciuto'}`
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, toast]);

  const acceptCall = () => {
    if (!incomingCall) return;
    navigate(`/call-room?targetUserId=${incomingCall.from}&roomId=${incomingCall.roomId}`);
    setIncomingCall(null);
  };

  const rejectCall = async () => {
    if (!incomingCall) return;

    // Notifica al chiamante che la chiamata è stata rifiutata
    const channel = supabase.channel(`user-calls-${incomingCall.from}`);
    await channel.send({
      type: 'broadcast',
      event: 'call-rejected',
      payload: { from: currentUserId, to: incomingCall.from }
    });
    await channel.unsubscribe();

    setIncomingCall(null);
  };

  return {
    incomingCall,
    acceptCall,
    rejectCall
  };
};
