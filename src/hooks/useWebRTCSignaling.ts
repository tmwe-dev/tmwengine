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

  // FIX FASE 1: Heartbeat 30s per mantenere viva la connessione
  useEffect(() => {
    if (!isReady || !channelRef.current) return;

    console.log('[WebRTCSignaling] ❤️ Starting heartbeat (30s interval)');
    
    const heartbeatInterval = setInterval(async () => {
      try {
        await channelRef.current?.send({
          type: 'broadcast',
          event: 'heartbeat',
          payload: { timestamp: Date.now() }
        });
        console.log('[WebRTCSignaling] 💓 Heartbeat sent');
      } catch (error) {
        console.error('[WebRTCSignaling] ❌ Heartbeat failed:', error);
      }
    }, 30000); // Ogni 30 secondi

    return () => {
      console.log('[WebRTCSignaling] 🛑 Stopping heartbeat');
      clearInterval(heartbeatInterval);
    };
  }, [isReady]);

  const sendSignal = useCallback(async (message: Omit<SignalingMessage, 'from'>) => {
    if (!channelRef.current) {
      console.error('[WebRTCSignaling] ❌ Channel not initialized');
      throw new Error('Channel not initialized');
    }

    if (!isReady) {
      console.warn('[WebRTCSignaling] ⏳ Waiting for channel to be ready...');
      // FIX FASE 1: Aspetta max 5s che il canale sia ready
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Channel ready timeout after 5s')), 5000);
        const checkInterval = setInterval(() => {
          if (isReady) {
            clearTimeout(timeout);
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });
    }

    const fullMessage: SignalingMessage = {
      ...message,
      from: userId,
    };

    console.log('[WebRTCSignaling] 📤 Sending signal:', fullMessage.type, 'to:', fullMessage.to);

    try {
      // FIX FASE 1: Race tra send e timeout 5s
      await Promise.race([
        channelRef.current.send({
          type: 'broadcast',
          event: 'webrtc-signal',
          payload: fullMessage,
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Send timeout after 5s')), 5000)
        )
      ]);
      console.log('[WebRTCSignaling] ✅ Signal sent successfully');
    } catch (error) {
      console.error('[WebRTCSignaling] ❌ Error sending signal:', error);
      throw error;
    }
  }, [userId, isReady]);

  const setHandlers = useCallback((handlers: typeof handlersRef.current) => {
    handlersRef.current = { ...handlersRef.current, ...handlers };
  }, []);

  return { sendSignal, setHandlers, isReady };
};
