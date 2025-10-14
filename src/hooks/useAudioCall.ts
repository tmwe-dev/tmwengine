import { useState, useCallback, useRef, useEffect } from 'react';
import { WebRTCPeerConnection } from '@/utils/webrtc/PeerConnection';
import { useWebRTCSignaling } from './useWebRTCSignaling';
import { useToast } from './use-toast';
import { supabase } from '@/integrations/supabase/client';

export const useAudioCall = (roomId: string, userId: string) => {
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [remotePeerId, setRemotePeerId] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const [networkQuality, setNetworkQuality] = useState<'good' | 'poor' | 'bad'>('good');
  const [incomingCallFrom, setIncomingCallFrom] = useState<string | null>(null);
  const [waitingForRecipient, setWaitingForRecipient] = useState<string | null>(null);

  const peerConnectionRef = useRef<WebRTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const pendingOfferRef = useRef<{ from: string; offer: RTCSessionDescriptionInit } | null>(null);
  const pendingCallDataRef = useRef<{ targetUserId: string; stream: MediaStream; pc: WebRTCPeerConnection } | null>(null);

  const { toast } = useToast();
  const { sendSignal, setHandlers } = useWebRTCSignaling(roomId, userId);

  const monitorNetworkQuality = useCallback(async () => {
    if (!peerConnectionRef.current) return;

    const stats = await peerConnectionRef.current.getStats();
    let rtt = 0;
    let packetLoss = 0;

    stats.forEach((report: any) => {
      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        rtt = report.currentRoundTripTime * 1000;
      }
      if (report.type === 'inbound-rtp' && report.kind === 'audio') {
        const packetsLost = report.packetsLost || 0;
        const packetsReceived = report.packetsReceived || 1;
        packetLoss = packetsLost / (packetsLost + packetsReceived);
      }
    });

    if (rtt > 300 || packetLoss > 0.05) {
      setNetworkQuality('bad');
    } else if (rtt > 200 || packetLoss > 0.02) {
      setNetworkQuality('poor');
    } else {
      setNetworkQuality('good');
    }
  }, []);

  const endCall = useCallback(() => {
    if (remotePeerId) {
      sendSignal({ type: 'call-end', to: remotePeerId, payload: {} });
    }

    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;

    localStreamRef.current?.getTracks().forEach(track => track.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }

    setIsInCall(false);
    setIsMuted(false);
    setRemotePeerId(null);
    setConnectionState('new');
    setNetworkQuality('good');
    setIncomingCallFrom(null);
    pendingOfferRef.current = null;
    pendingCallDataRef.current = null;
    setWaitingForRecipient(null);
  }, [remotePeerId, sendSignal]);

  useEffect(() => {
    setHandlers({
      onOffer: async (offer, from) => {
        console.log('[useAudioCall] Received offer from:', from);
        // Salva l'offer per rispondere manualmente
        pendingOfferRef.current = { from, offer };
        setIncomingCallFrom(from);
        setRemotePeerId(from);
        
        toast({
          title: 'Chiamata in arrivo',
          description: 'Premi Rispondi per accettare'
        });
      },
      onAnswer: async (answer) => {
        console.log('[useAudioCall] Received answer');
        await peerConnectionRef.current?.setRemoteDescription(answer);
      },
      onIceCandidate: async (candidate) => {
        console.log('[useAudioCall] Received ICE candidate');
        await peerConnectionRef.current?.addIceCandidate(candidate);
      },
      onCallStart: (from) => {
        console.log('[useAudioCall] Call started by:', from);
        toast({
          title: 'Chiamata in arrivo',
          description: `Chiamata da utente ${from.substring(0, 8)}...`
        });
      },
      onCallEnd: (from) => {
        console.log('[useAudioCall] Call ended by:', from);
        endCall();
      },
      onCallRejected: (from) => {
        console.log('[useAudioCall] Call rejected by:', from);
        toast({
          title: 'Chiamata rifiutata',
          description: 'L\'utente ha rifiutato la chiamata',
          variant: 'destructive'
        });
        endCall();
      },
      onReady: async (from) => {
        console.log('[useAudioCall] 🟢 Recipient is READY:', from);
        // Bob è pronto - Alice può inviare l'offer ora
        if (pendingCallDataRef.current && pendingCallDataRef.current.targetUserId === from) {
          const { targetUserId, stream, pc } = pendingCallDataRef.current;
          console.log('[useAudioCall] Sending offer to ready recipient:', targetUserId);
          
          await pc.addLocalStream(stream);
          const offer = await pc.createOffer();
          await sendSignal({ type: 'offer', to: targetUserId, payload: offer });
          await sendSignal({ type: 'call-start', to: targetUserId, payload: {} });
          
          pendingCallDataRef.current = null;
          
          toast({
            title: 'Chiamata in corso',
            description: 'In attesa di risposta...'
          });
        }
      }
    });
  }, [sendSignal, setHandlers, monitorNetworkQuality, toast, endCall]);

  const startCall = useCallback(async (targetUserId?: string) => {
    try {
      console.log('[useAudioCall] 🔵 START CALL INVOKED', { 
        targetUserId, 
        currentUserId: userId, 
        isSelfCall: targetUserId === userId 
      });
      
      // 🆕 Blocca auto-chiamate
      if (targetUserId === userId) {
        console.error('[useAudioCall] ❌ BLOCKED: Cannot call yourself!');
        toast({
          title: 'Errore',
          description: 'Non puoi chiamare te stesso!',
          variant: 'destructive'
        });
        return;
      }
      
      // 🆕 INVIA NOTIFICA GLOBALE PRIMA DI TUTTO
      if (targetUserId) {
        const channel = supabase.channel(`user-calls-${targetUserId}`);
        
        // Sottoscrivi prima di inviare
        await channel.subscribe();
        
        await channel.send({
          type: 'broadcast',
          event: 'incoming-call',
          payload: {
            from: userId,
            to: targetUserId,
            roomId: roomId
          }
        });
        
        console.log('[useAudioCall] ✅ Global call notification sent to:', targetUserId);
        
        // Lascia aperto il canale per 2 secondi prima di chiuderlo
        setTimeout(() => {
          channel.unsubscribe();
        }, 2000);
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        }
      });

      console.log('[useAudioCall] Got local media stream');
      localStreamRef.current = stream;

      const pc = new WebRTCPeerConnection({
        onIceCandidate: (candidate) => {
          console.log('[useAudioCall] Sending ICE candidate to:', targetUserId);
          sendSignal({ type: 'ice-candidate', to: targetUserId, payload: candidate });
        },
        onRemoteStream: (stream) => {
          console.log('[useAudioCall] Received remote stream');
          remoteStreamRef.current = stream;
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = stream;
          }
          setIsInCall(true);
        },
        onConnectionStateChange: (state) => {
          console.log('[useAudioCall] Connection state changed:', state);
          setConnectionState(state);
        }
      });

      peerConnectionRef.current = pc;
      if (targetUserId) setRemotePeerId(targetUserId);
      setIsInCall(true);

      // Salva i dati della chiamata e aspetta il segnale "ready" da Bob
      console.log('[useAudioCall] Waiting for recipient to be ready...');
      pendingCallDataRef.current = { targetUserId, stream, pc };
      setWaitingForRecipient(targetUserId);

      statsIntervalRef.current = setInterval(monitorNetworkQuality, 5000);

      toast({
        title: 'Chiamata avviata',
        description: 'In attesa che l\'altro utente risponda...'
      });
    } catch (error: any) {
      console.error('[useAudioCall] Error starting call:', error);
      toast({
        title: 'Errore',
        description: error.name === 'NotAllowedError' 
          ? 'Permessi microfono negati' 
          : 'Impossibile avviare la chiamata',
        variant: 'destructive'
      });
    }
  }, [sendSignal, toast, monitorNetworkQuality, waitingForRecipient]);

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  }, []);

  const answerCall = useCallback(async () => {
    console.log('[answerCall] 🟢 STARTING');
    console.log('[answerCall] pendingOffer:', pendingOfferRef.current);
    
    if (!pendingOfferRef.current) {
      console.error('[answerCall] ❌ No pending offer!');
      toast({
        title: 'Errore',
        description: 'Nessuna chiamata in attesa',
        variant: 'destructive'
      });
      return;
    }

    const { from, offer } = pendingOfferRef.current;
    console.log('[answerCall] Answering call from:', from);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        }
      });

      localStreamRef.current = stream;

      const pc = new WebRTCPeerConnection({
        onIceCandidate: (candidate) => {
          sendSignal({ type: 'ice-candidate', to: from, payload: candidate });
        },
        onRemoteStream: (stream) => {
          remoteStreamRef.current = stream;
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = stream;
          }
        },
        onConnectionStateChange: setConnectionState
      });

      await pc.addLocalStream(stream);
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await sendSignal({ type: 'answer', to: from, payload: answer });

      peerConnectionRef.current = pc;
      setIsInCall(true);
      setIncomingCallFrom(null);
      pendingOfferRef.current = null;

      statsIntervalRef.current = setInterval(monitorNetworkQuality, 5000);

      console.log('[answerCall] ✅ COMPLETED - WebRTC connection established, isInCall=true');
      
      toast({
        title: 'Chiamata accettata',
        description: 'Connessione in corso...'
      });
    } catch (error: any) {
      console.error('[useAudioCall] Error answering call:', error);
      toast({
        title: 'Errore',
        description: error.name === 'NotAllowedError' 
          ? 'Permessi microfono negati' 
          : 'Impossibile rispondere alla chiamata',
        variant: 'destructive'
      });
      setIncomingCallFrom(null);
      pendingOfferRef.current = null;
    }
  }, [sendSignal, toast, monitorNetworkQuality]);

  const rejectCall = useCallback(() => {
    if (incomingCallFrom) {
      console.log('[useAudioCall] Rejecting call from:', incomingCallFrom);
      sendSignal({ type: 'call-rejected', to: incomingCallFrom, payload: {} });
      setIncomingCallFrom(null);
      pendingOfferRef.current = null;
      setRemotePeerId(null);
      
      toast({
        title: 'Chiamata rifiutata',
        description: 'Hai rifiutato la chiamata'
      });
    }
  }, [incomingCallFrom, sendSignal, toast]);

  return {
    isInCall,
    isMuted,
    remotePeerId,
    connectionState,
    networkQuality,
    incomingCallFrom,
    localStream: localStreamRef.current,
    remoteStream: remoteStreamRef.current,
    remoteAudioRef,
    startCall,
    endCall,
    toggleMute,
    answerCall,
    rejectCall
  };
};
