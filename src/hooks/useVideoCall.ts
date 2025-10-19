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
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'ringing' | 'connected'>('idle');

  const peerConnectionRef = useRef<WebRTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const pendingOfferRef = useRef<{ from: string; offer: RTCSessionDescriptionInit } | null>(null);
  const offerSentRef = useRef(false);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  const { toast } = useToast();
  const { sendSignal, setHandlers, isReady } = useWebRTCSignaling(`${roomId}-video`, userId);

  useEffect(() => {
    setHandlers({
      onOffer: async (offer, from) => {
        console.log('[useVideoCall] Received offer from:', from);
        pendingOfferRef.current = { from, offer };
        setIncomingCallFrom(from);
        setRemotePeerId(from);
        setCallStatus('ringing');
      },
      onAnswer: async (answer) => {
        console.log('[useVideoCall] Received answer');
        try {
          await peerConnectionRef.current?.setRemoteDescription(answer);
        } catch (error) {
          console.error('[useVideoCall] Error setting remote description:', error);
        }
      },
      onIceCandidate: async (candidate) => {
        console.log('[useVideoCall] Received ICE candidate');
        if (!peerConnectionRef.current) {
          console.warn('[useVideoCall] Buffering ICE candidate - no peer connection');
          pendingIceCandidatesRef.current.push(candidate);
          return;
        }
        await peerConnectionRef.current?.addIceCandidate(candidate);
      },
      onCallStart: (from) => {
        console.log('[useVideoCall] 📞 Call accepted by:', from);
        setCallStatus('connected');
        toast({ title: 'Chiamata accettata', description: 'Connessione in corso...' });
      },
      onCallEnd: () => {
        console.log('[useVideoCall] Call ended');
        endCall();
      },
      onCallRejected: (from) => {
        console.log('[useVideoCall] ❌ Call rejected by:', from);
        toast({ title: 'Chiamata rifiutata', variant: 'destructive' });
        endCall();
      }
    });
  }, [setHandlers, toast]);

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
          autoGainControl: true,
          sampleRate: 48000
        }
      });

      console.log('[useVideoCall] 🎙️ Local stream acquired:', {
        audioTracks: stream.getAudioTracks().length,
        videoTracks: stream.getVideoTracks().length,
        audioEnabled: stream.getAudioTracks()[0]?.enabled,
        videoEnabled: stream.getVideoTracks()[0]?.enabled
      });

      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack || !audioTrack.enabled) {
        console.error('[useVideoCall] ❌ Audio track not available or disabled!');
      }

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
          console.log('[useVideoCall] 📹 Remote stream received');
          
          const audioTracks = remoteStream.getAudioTracks();
          const videoTracks = remoteStream.getVideoTracks();
          
          console.log('[useVideoCall] Remote tracks:', {
            audio: audioTracks.length,
            video: videoTracks.length,
            audioEnabled: audioTracks[0]?.enabled,
            videoEnabled: videoTracks[0]?.enabled
          });
          
          if (audioTracks.length === 0) {
            console.error('[useVideoCall] ❌ No audio track in remote stream!');
          }
          
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
      setCallStatus('calling');

      await pc.addLocalStream(stream);

      console.log('[useVideoCall] ⏳ Waiting for ICE gathering...');
      await new Promise<void>((resolve) => {
        const check = () => {
          if (pc.getIceGatheringState() === 'complete') {
            console.log('[useVideoCall] ✅ ICE gathering complete');
            resolve();
          } else {
            setTimeout(check, 100);
          }
        };
        check();
        setTimeout(() => {
          console.log('[useVideoCall] ⏱️ ICE gathering timeout');
          resolve();
        }, 5000);
      });

      const offer = await pc.createOffer();
      offerSentRef.current = true;
      
      try {
        await sendSignal({ type: 'offer', to: targetUserId, payload: offer });
        console.log('[useVideoCall] ✅ Offer sent');
      } catch (error) {
        console.error('[useVideoCall] ❌ Error sending offer:', error);
      }

      console.log('[useVideoCall] Sending', pendingIceCandidatesRef.current.length, 'buffered ICE candidates');
      for (const candidate of pendingIceCandidatesRef.current) {
        try {
          await sendSignal({ type: 'ice-candidate', to: targetUserId, payload: candidate });
        } catch (error) {
          console.error('[useVideoCall] ❌ Error sending ICE candidate:', error);
        }
      }
      pendingIceCandidatesRef.current = [];

      const channel = supabase.channel(`user-calls-${targetUserId}`);
      await channel.subscribe();
      await channel.send({
        type: 'broadcast',
        event: 'incoming-call',
        payload: { from: userId, to: targetUserId, roomId, callType: 'video' }
      });

      toast({ title: 'Videochiamata avviata', description: 'In attesa di risposta...' });
    } catch (error: any) {
      console.error('[useVideoCall] ❌ Error starting video call:', error);
      setCallStatus('idle');
      
      let description = 'Impossibile avviare';
      if (error.name === 'NotAllowedError') {
        description = 'Permessi negati per camera/microfono';
      } else if (error.name === 'NotReadableError') {
        description = 'Camera/microfono già in uso';
      } else if (error.name === 'NotFoundError') {
        description = 'Camera/microfono non trovati';
      }
      
      toast({ title: 'Errore', description, variant: 'destructive' });
    }
  }, [userId, sendSignal, toast, remotePeerId]);

  const answerCall = useCallback(async (callerId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        }
      });

      console.log('[useVideoCall] 🎙️ Local stream acquired (answering):', {
        audioTracks: stream.getAudioTracks().length,
        videoTracks: stream.getVideoTracks().length,
        audioEnabled: stream.getAudioTracks()[0]?.enabled,
        videoEnabled: stream.getVideoTracks()[0]?.enabled
      });

      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack || !audioTrack.enabled) {
        console.error('[useVideoCall] ❌ Audio track not available or disabled!');
      }

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new WebRTCPeerConnection({
        onIceCandidate: (candidate) => {
          try {
            sendSignal({ type: 'ice-candidate', to: callerId, payload: candidate });
          } catch (error) {
            console.error('[useVideoCall] ❌ Error sending ICE candidate:', error);
          }
        },
        onRemoteStream: (remoteStream) => {
          console.log('[useVideoCall] 📹 Remote stream received (answering)');
          
          const audioTracks = remoteStream.getAudioTracks();
          const videoTracks = remoteStream.getVideoTracks();
          
          console.log('[useVideoCall] Remote tracks:', {
            audio: audioTracks.length,
            video: videoTracks.length,
            audioEnabled: audioTracks[0]?.enabled,
            videoEnabled: videoTracks[0]?.enabled
          });
          
          if (audioTracks.length === 0) {
            console.error('[useVideoCall] ❌ No audio track in remote stream!');
          }
          
          remoteStreamRef.current = remoteStream;
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
          setIsInCall(true);
        },
        onConnectionStateChange: setConnectionState
      });

      peerConnectionRef.current = pc;
      setRemotePeerId(callerId);
      
      await pc.addLocalStream(stream);

      if (pendingOfferRef.current) {
        await pc.setRemoteDescription(pendingOfferRef.current.offer);
      }

      console.log('[useVideoCall] ⏳ Waiting for ICE gathering before sending answer...');
      await new Promise<void>((resolve) => {
        const check = () => {
          if (pc.getIceGatheringState() === 'complete') {
            console.log('[useVideoCall] ✅ ICE gathering complete');
            resolve();
          } else {
            setTimeout(check, 100);
          }
        };
        check();
        setTimeout(() => {
          console.log('[useVideoCall] ⏱️ ICE gathering timeout');
          resolve();
        }, 3000);
      });

      const answer = await pc.createAnswer();
      
      try {
        await sendSignal({ type: 'answer', to: callerId, payload: answer });
        console.log('[useVideoCall] ✅ Answer sent');
        
        await sendSignal({ type: 'call-start', to: callerId, payload: {} });
        console.log('[useVideoCall] ✅ Sent call-accepted signal to caller');
        
        setCallStatus('connected');
      } catch (error) {
        console.error('[useVideoCall] ❌ Error sending answer:', error);
      }

      setIncomingCallFrom(null);
    } catch (error: any) {
      console.error('[useVideoCall] ❌ Error answering video call:', error);
      setCallStatus('idle');
      
      let description = 'Impossibile rispondere';
      if (error.name === 'NotAllowedError') {
        description = 'Permessi negati per camera/microfono';
      } else if (error.name === 'NotReadableError') {
        description = 'Camera/microfono già in uso';
      }
      
      toast({ title: 'Errore', description, variant: 'destructive' });
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

  const endCall = useCallback(async () => {
    console.log('[useVideoCall] 🔚 Ending call');
    
    if (remotePeerId) {
      try {
        await sendSignal({ type: 'call-end', to: remotePeerId, payload: {} });
        await new Promise(resolve => setTimeout(resolve, 200));
        console.log('[useVideoCall] ✅ Call-end signal sent');
      } catch (error) {
        console.error('[useVideoCall] ❌ Error sending call-end:', error);
      }
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
    setCallStatus('idle');
    pendingOfferRef.current = null;
    offerSentRef.current = false;
    pendingIceCandidatesRef.current = [];
    
    console.log('[useVideoCall] ✅ Call cleanup complete');
  }, [remotePeerId, sendSignal]);

  return {
    isInCall,
    isMuted,
    isVideoOff,
    remotePeerId,
    connectionState,
    incomingCallFrom,
    callStatus,
    localVideoRef,
    remoteVideoRef,
    startCall,
    answerCall,
    endCall,
    toggleMute,
    toggleVideo
  };
};
