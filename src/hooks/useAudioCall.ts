import { useState, useCallback, useRef, useEffect } from 'react';
import { WebRTCPeerConnection } from '@/utils/webrtc/PeerConnection';
import { useWebRTCSignaling } from './useWebRTCSignaling';
import { useToast } from './use-toast';

export const useAudioCall = (roomId: string, userId: string) => {
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [remotePeerId, setRemotePeerId] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const [networkQuality, setNetworkQuality] = useState<'good' | 'poor' | 'bad'>('good');

  const peerConnectionRef = useRef<WebRTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

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

  useEffect(() => {
    setHandlers({
      onOffer: async (offer, from) => {
        console.log('Received offer from:', from);
        setRemotePeerId(from);
        
        const pc = new WebRTCPeerConnection({
          onIceCandidate: (candidate) => {
            sendSignal({ type: 'ice-candidate', to: from, payload: candidate });
          },
          onRemoteStream: (stream) => {
            remoteStreamRef.current = stream;
            if (remoteAudioRef.current) {
              remoteAudioRef.current.srcObject = stream;
            }
            setIsInCall(true);
          },
          onConnectionStateChange: setConnectionState
        });

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000
          }
        });

        localStreamRef.current = stream;
        await pc.addLocalStream(stream);
        await pc.setRemoteDescription(offer);
        const answer = await pc.createAnswer();
        await sendSignal({ type: 'answer', to: from, payload: answer });

        peerConnectionRef.current = pc;
        statsIntervalRef.current = setInterval(monitorNetworkQuality, 5000);
      },
      onAnswer: async (answer) => {
        console.log('Received answer');
        await peerConnectionRef.current?.setRemoteDescription(answer);
      },
      onIceCandidate: async (candidate) => {
        await peerConnectionRef.current?.addIceCandidate(candidate);
      },
      onCallEnd: (from) => {
        console.log('Call ended by:', from);
        endCall();
      }
    });
  }, [sendSignal, setHandlers, monitorNetworkQuality]);

  const startCall = useCallback(async (targetUserId?: string) => {
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
          sendSignal({ type: 'ice-candidate', to: targetUserId, payload: candidate });
        },
        onRemoteStream: (stream) => {
          remoteStreamRef.current = stream;
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = stream;
          }
          setIsInCall(true);
        },
        onConnectionStateChange: setConnectionState
      });

      await pc.addLocalStream(stream);
      const offer = await pc.createOffer();
      await sendSignal({ type: 'offer', to: targetUserId, payload: offer });
      await sendSignal({ type: 'call-start', to: targetUserId, payload: {} });

      peerConnectionRef.current = pc;
      if (targetUserId) setRemotePeerId(targetUserId);
      setIsInCall(true);

      statsIntervalRef.current = setInterval(monitorNetworkQuality, 5000);

      toast({
        title: 'Chiamata avviata',
        description: 'Chiamata vocale in corso'
      });
    } catch (error: any) {
      console.error('Error starting call:', error);
      toast({
        title: 'Errore',
        description: error.name === 'NotAllowedError' 
          ? 'Permessi microfono negati' 
          : 'Impossibile avviare la chiamata',
        variant: 'destructive'
      });
    }
  }, [sendSignal, toast, monitorNetworkQuality]);

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
    setRemotePeerId(null);
    setConnectionState('new');
    setNetworkQuality('good');

    toast({
      title: 'Chiamata terminata',
      description: 'La chiamata è stata chiusa'
    });
  }, [remotePeerId, sendSignal, toast]);

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  }, []);

  return {
    isInCall,
    isMuted,
    remotePeerId,
    connectionState,
    networkQuality,
    localStream: localStreamRef.current,
    remoteStream: remoteStreamRef.current,
    remoteAudioRef,
    startCall,
    endCall,
    toggleMute
  };
};
