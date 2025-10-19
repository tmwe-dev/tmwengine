import { useEffect, useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'call-start' | 'call-end' | 'call-rejected' | 'ready';
  from: string;
  to?: string;
  payload: any;
}

export const useWebRTCSignaling = (roomId: string, userId: string) => {
  const channelRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const handlersRef = useRef<{
    onOffer?: (offer: RTCSessionDescriptionInit, from: string) => void;
    onAnswer?: (answer: RTCSessionDescriptionInit) => void;
    onIceCandidate?: (candidate: RTCIceCandidateInit) => void;
    onCallStart?: (from: string) => void;
    onCallEnd?: (from: string) => void;
  onCallRejected?: (from: string) => void;
  onReady?: (from: string) => void;
  }>({});

  useEffect(() => {
    if (!roomId || !userId) {
      setIsReady(false);
      return;
    }

    console.log('[WebRTCSignaling] Connecting to channel:', `call-room-${roomId}-webrtc`);
    const channel = supabase.channel(`call-room-${roomId}-webrtc`);

    channel
      .on('broadcast', { event: 'webrtc-signal' }, ({ payload }) => {
        const message = payload as SignalingMessage;
        
        console.log('[WebRTCSignaling] Received signal:', message.type, 'from:', message.from);
        
        if (message.from === userId) {
          console.log('[WebRTCSignaling] Ignoring own message');
          return;
        }
        if (message.to && message.to !== userId) {
          console.log('[WebRTCSignaling] Message not for me, ignoring');
          return;
        }

        switch (message.type) {
          case 'offer':
            console.log('[WebRTCSignaling] Processing offer from:', message.from);
            handlersRef.current.onOffer?.(message.payload, message.from);
            break;
          case 'answer':
            console.log('[WebRTCSignaling] Processing answer');
            handlersRef.current.onAnswer?.(message.payload);
            break;
          case 'ice-candidate':
            console.log('[WebRTCSignaling] Processing ICE candidate');
            handlersRef.current.onIceCandidate?.(message.payload);
            break;
          case 'call-start':
            console.log('[WebRTCSignaling] Processing call-start from:', message.from);
            handlersRef.current.onCallStart?.(message.from);
            break;
          case 'call-end':
            console.log('[WebRTCSignaling] Processing call-end from:', message.from);
            handlersRef.current.onCallEnd?.(message.from);
            break;
          case 'call-rejected':
            console.log('[WebRTCSignaling] Processing call-rejected from:', message.from);
            handlersRef.current.onCallRejected?.(message.from);
            break;
          case 'ready':
            console.log('[WebRTCSignaling] Processing ready signal from:', message.from);
            handlersRef.current.onReady?.(message.from);
            break;
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[WebRTCSignaling] ✅ Channel ready and subscribed');
          setIsReady(true);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[WebRTCSignaling] ❌ Channel error');
          setIsReady(false);
        }
      });

    channelRef.current = channel;

    return () => {
      console.log('[WebRTCSignaling] Unsubscribing from channel');
      setIsReady(false);
      channel.unsubscribe();
    };
  }, [roomId, userId]);

  const sendSignal = useCallback(async (message: Omit<SignalingMessage, 'from'>) => {
    if (!channelRef.current) {
      console.error('[WebRTCSignaling] ❌ Channel not initialized');
      throw new Error('Channel not ready');
    }
    
    if (!isReady) {
      console.warn('[WebRTCSignaling] ⚠️ Channel not ready, waiting...');
      await new Promise(resolve => setTimeout(resolve, 500));
      if (!isReady) {
        console.error('[WebRTCSignaling] ❌ Channel still not ready after wait');
        throw new Error('Channel timeout');
      }
    }
    
    const fullMessage: SignalingMessage = { ...message, from: userId };
    console.log('[WebRTCSignaling] Sending signal:', fullMessage.type, 'to:', fullMessage.to);
    
    return await channelRef.current.send({
      type: 'broadcast',
      event: 'webrtc-signal',
      payload: fullMessage
    });
  }, [userId, isReady]);

  const setHandlers = useCallback((handlers: typeof handlersRef.current) => {
    handlersRef.current = { ...handlersRef.current, ...handlers };
  }, []);

  return { sendSignal, setHandlers, isReady };
};
