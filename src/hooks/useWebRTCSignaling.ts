import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'call-start' | 'call-end';
  from: string;
  to?: string;
  payload: any;
}

export const useWebRTCSignaling = (roomId: string, userId: string) => {
  const channelRef = useRef<any>(null);
  const handlersRef = useRef<{
    onOffer?: (offer: RTCSessionDescriptionInit, from: string) => void;
    onAnswer?: (answer: RTCSessionDescriptionInit) => void;
    onIceCandidate?: (candidate: RTCIceCandidateInit) => void;
    onCallStart?: (from: string) => void;
    onCallEnd?: (from: string) => void;
  }>({});

  useEffect(() => {
    if (!roomId || !userId) return;

    const channel = supabase.channel(`call-room-${roomId}-webrtc`);

    channel
      .on('broadcast', { event: 'webrtc-signal' }, ({ payload }) => {
        const message = payload as SignalingMessage;
        
        if (message.from === userId) return;
        if (message.to && message.to !== userId) return;

        switch (message.type) {
          case 'offer':
            handlersRef.current.onOffer?.(message.payload, message.from);
            break;
          case 'answer':
            handlersRef.current.onAnswer?.(message.payload);
            break;
          case 'ice-candidate':
            handlersRef.current.onIceCandidate?.(message.payload);
            break;
          case 'call-start':
            handlersRef.current.onCallStart?.(message.from);
            break;
          case 'call-end':
            handlersRef.current.onCallEnd?.(message.from);
            break;
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [roomId, userId]);

  const sendSignal = useCallback((message: Omit<SignalingMessage, 'from'>) => {
    if (!channelRef.current) return;
    
    channelRef.current.send({
      type: 'broadcast',
      event: 'webrtc-signal',
      payload: { ...message, from: userId }
    });
  }, [userId]);

  const setHandlers = useCallback((handlers: typeof handlersRef.current) => {
    handlersRef.current = { ...handlersRef.current, ...handlers };
  }, []);

  return { sendSignal, setHandlers };
};
