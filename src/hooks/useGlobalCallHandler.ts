import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

interface IncomingCall {
  from: string;
  callerName: string;
  roomId: string;
  callType?: 'audio' | 'video';
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
        console.log('[GlobalCallHandler] 🔔 Incoming call received:', payload);

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

        const callData = {
          from: payload.from,
          callerName: callerProfile?.display_name || 'Utente sconosciuto',
          roomId: payload.roomId,
          callType: payload.callType || 'audio'
        };

        // FIX #1: Salva in sessionStorage per sincronizzazione cross-component
        sessionStorage.setItem('pendingIncomingCall', JSON.stringify(callData));
        console.log('[GlobalCallHandler] ✅ Saved to sessionStorage:', callData);

        // Setta incomingCall per mostrare dialog
        console.log('[GlobalCallHandler] 🔔 Setting incoming call state');
        setIncomingCall(callData);

        toast({
          title: payload.callType === 'video' ? '📹 Videochiamata in arrivo' : '📞 Chiamata in arrivo',
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
    
    console.log('[GlobalCallHandler] ✅ Call accepted');
    
    sessionStorage.setItem('callAccepted', 'true');
    
    if (incomingCall.callType === 'video') {
      console.log('[GlobalCallHandler] 📹 Video call - dispatching event');
      
      window.dispatchEvent(new CustomEvent('open-video-call-dialog', {
        detail: {
          targetUserId: incomingCall.from,
          targetUserName: incomingCall.callerName,
          roomId: incomingCall.roomId,
          isIncoming: true
        }
      }));
      
    } else {
      console.log('[GlobalCallHandler] 📞 Audio call - navigating to CallRoom');
      navigate(`/call-room?targetUserId=${incomingCall.from}&roomId=${incomingCall.roomId}&acceptedCall=true&incomingFrom=${incomingCall.from}`);
    }
    
    sessionStorage.removeItem('pendingIncomingCall');
    setIncomingCall(null);
  };

  const rejectCall = async () => {
    if (!incomingCall) return;

    console.log('[GlobalCallHandler] ❌ Call rejected by user');
    
    // Notifica al chiamante che la chiamata è stata rifiutata
    const channel = supabase.channel(`user-calls-${incomingCall.from}`);
    await channel.send({
      type: 'broadcast',
      event: 'call-rejected',
      payload: { from: currentUserId, to: incomingCall.from }
    });
    await channel.unsubscribe();

    // FIX #1: Pulisci anche sessionStorage
    sessionStorage.removeItem('pendingIncomingCall');
    console.log('[GlobalCallHandler] 🗑️ Cleared sessionStorage');

    setIncomingCall(null);
  };

  return {
    incomingCall,
    acceptCall,
    rejectCall
  };
};
