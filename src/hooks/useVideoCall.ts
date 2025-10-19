import { useState, useCallback, useRef, useEffect } from 'react';
import { WebRTCPeerConnection } from '@/utils/webrtc/PeerConnection';
import { useWebRTCSignaling } from './useWebRTCSignaling';
import { useToast } from './use-toast';
import { supabase } from '@/integrations/supabase/client';

export const useVideoCall = (roomId: string, userId: string) => {
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [remotePeerId, setRemotePeerId] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const [incomingCallFrom, setIncomingCallFrom] = useState<string | null>(null);

  const peerConnectionRef = useRef<WebRTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const pendingOfferRef = useRef<{ from: string; offer: RTCSessionDescriptionInit } | null>(null);
  const offerSentRef = useRef(false);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  const { toast } = useToast();
  const { sendSignal, setHandlers } = useWebRTCSignaling(`${roomId}-video`, userId);

  useEffect(() => {
    setHandlers({
      onOffer: async (offer, from) => {
        console.log('[useVideoCall] Received offer from:', from);
        pendingOfferRef.current = { from, offer };
        setIncomingCallFrom(from);
        setRemotePeerId(from);
      },
      onAnswer: async (answer) => {
        console.log('[useVideoCall] Received answer');
        await peerConnectionRef.current?.setRemoteDescription(answer);
      },
      onIceCandidate: async (candidate) => {
        console.log('[useVideoCall] Received ICE candidate');
        await peerConnectionRef.current?.addIceCandidate(candidate);
      },
      onCallEnd: () => {
        console.log('[useVideoCall] Call ended');
        endCall();
      }
    });
  }, [setHandlers]);

  const startCall = useCallback(async (targetUserId: string) => {
    try {
      if (targetUserId === userId) {
        toast({ title: 'Errore', description: 'Non puoi chiamare te stesso!', variant: 'destructive' });
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      localStreamRef.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new WebRTCPeerConnection({
        onIceCandidate: (candidate) => {
          if (offerSentRef.current && remotePeerId) {
            sendSignal({ type: 'ice-candidate', to: remotePeerId, payload: candidate });
          } else {
            pendingIceCandidatesRef.current.push(candidate);
          }
        },
        onRemoteStream: (remoteStream) => {
          remoteStreamRef.current = remoteStream;
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
          setIsInCall(true);
        },
        onConnectionStateChange: (state) => {
          setConnectionState(state);
        }
      });

      peerConnectionRef.current = pc;
      setRemotePeerId(targetUserId);

      await pc.addLocalStream(stream);

      await new Promise<void>((resolve) => {
        const check = () => {
          if (pc.getIceGatheringState() === 'complete') {
            resolve();
          } else {
            setTimeout(check, 100);
          }
        };
        check();
        setTimeout(resolve, 5000);
      });

      const offer = await pc.createOffer();
      offerSentRef.current = true;
      await sendSignal({ type: 'offer', to: targetUserId, payload: offer });

      pendingIceCandidatesRef.current.forEach(candidate => {
        sendSignal({ type: 'ice-candidate', to: targetUserId, payload: candidate });
      });
      pendingIceCandidatesRef.current = [];

      const channel = supabase.channel(`user-calls-${targetUserId}`);
      await channel.subscribe();
      await channel.send({
        type: 'broadcast',
        event: 'incoming-call',
        payload: { from: userId, to: targetUserId, roomId, callType: 'video' }
      });
      setTimeout(() => channel.unsubscribe(), 2000);

      toast({ title: 'Videochiamata avviata', description: 'In attesa di risposta...' });
    } catch (error: any) {
      console.error('Error starting video call:', error);
      toast({
        title: 'Errore',
        description: error.name === 'NotAllowedError' ? 'Permessi negati' : 'Impossibile avviare',
        variant: 'destructive'
      });
    }
  }, [userId, sendSignal, toast, remotePeerId]);

  const answerCall = useCallback(async (callerId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new WebRTCPeerConnection({
        onIceCandidate: (candidate) => {
          sendSignal({ type: 'ice-candidate', to: callerId, payload: candidate });
        },
        onRemoteStream: (remoteStream) => {
          remoteStreamRef.current = remoteStream;
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
          setIsInCall(true);
        },
        onConnectionStateChange: setConnectionState
      });

      peerConnectionRef.current = pc;
      await pc.addLocalStream(stream);

      if (pendingOfferRef.current) {
        await pc.setRemoteDescription(pendingOfferRef.current.offer);
      }

      const answer = await pc.createAnswer();
      await sendSignal({ type: 'answer', to: callerId, payload: answer });

      setIncomingCallFrom(null);
    } catch (error) {
      console.error('Error answering video call:', error);
      toast({ title: 'Errore', description: 'Impossibile rispondere', variant: 'destructive' });
    }
  }, [sendSignal, toast]);

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (!localStreamRef.current) return;
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOff(!videoTrack.enabled);
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

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    setIsInCall(false);
    setIsMuted(false);
    setIsVideoOff(false);
    setRemotePeerId(null);
    setIncomingCallFrom(null);
    offerSentRef.current = false;
    pendingIceCandidatesRef.current = [];
  }, [remotePeerId, sendSignal]);

  return {
    isInCall,
    isMuted,
    isVideoOff,
    remotePeerId,
    connectionState,
    incomingCallFrom,
    localVideoRef,
    remoteVideoRef,
    startCall,
    answerCall,
    endCall,
    toggleMute,
    toggleVideo
  };
};
