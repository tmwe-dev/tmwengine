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
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'ringing' | 'connecting' | 'connected'>('idle');
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'medium' | 'poor'>('good');

  const peerConnectionRef = useRef<WebRTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const pendingOfferRef = useRef<{ from: string; offer: RTCSessionDescriptionInit } | null>(null);
  const offerSentRef = useRef(false);
  const answerSentRef = useRef(false);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const broadcastChannelRef = useRef<any>(null);
  // FIX FASE 2: De-duplication offer con hash
  const offerHashRef = useRef<string>('');

  const { toast } = useToast();
  const { sendSignal, setHandlers, isReady } = useWebRTCSignaling(`${roomId}-video`, userId);

  useEffect(() => {
    setHandlers({
      onOffer: async (offer, from) => {
        // FIX FASE 2: De-duplication con hash
        const hash = btoa(offer.sdp?.substring(0, 100) || '');
        if (hash === offerHashRef.current) {
          console.warn('[useVideoCall] ⚠️ Duplicate offer ignored (hash match)');
          return;
        }
        offerHashRef.current = hash;
        
        const timestamp = new Date().toISOString();
        console.log(`[useVideoCall] 📥 OFFER ricevuto alle ${timestamp} da:`, from);
        console.log('[useVideoCall] pendingOfferRef prima:', pendingOfferRef.current ? 'POPULATED' : 'NULL');
        
        if (callStatus !== 'idle') {
          console.warn('[useVideoCall] ⚠️ Already in call state:', callStatus);
        }
        setCallStatus('idle');
        pendingOfferRef.current = { from, offer };
        setIncomingCallFrom(from);
        setRemotePeerId(from);
        setCallStatus('ringing');
        
        console.log('[useVideoCall] pendingOfferRef dopo:', pendingOfferRef.current ? 'POPULATED' : 'NULL');
        console.log('[useVideoCall] ✅ OFFER salvato in pendingOfferRef');
        
        // FIX #5: Salva anche in sessionStorage come backup con timestamp
        sessionStorage.setItem('pendingOffer', JSON.stringify(offer));
        sessionStorage.setItem('pendingOfferFrom', from);
        sessionStorage.setItem('pendingOfferTimestamp', Date.now().toString());
        console.log('[useVideoCall] ✅ OFFER salvato anche in sessionStorage con timestamp');
      },
      onAnswer: async (answer) => {
        console.log('[useVideoCall] Received answer');
        try {
          // FIX #2: Wait for offer to be set before applying answer
          let retries = 0;
          while (peerConnectionRef.current && 
                 peerConnectionRef.current.getSignalingState() === 'have-local-offer' && 
                 retries < 20) {
            await new Promise(r => setTimeout(r, 100));
            retries++;
          }
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

  // FIX #9: Monitor connection quality with getStats()
  useEffect(() => {
    if (!isInCall || !peerConnectionRef.current) return;
    
    const monitorInterval = setInterval(async () => {
      const stats = await peerConnectionRef.current?.getStats();
      if (!stats) return;
      
      let packetsLost = 0;
      let packetsReceived = 0;
      
      stats.forEach((report) => {
        if (report.type === 'inbound-rtp' && report.kind === 'video') {
          packetsLost = report.packetsLost || 0;
          packetsReceived = report.packetsReceived || 0;
        }
      });
      
      const lossRate = packetsReceived > 0 ? packetsLost / packetsReceived : 0;
      
      if (lossRate > 0.1) {
        setConnectionQuality('poor');
        console.warn('[useVideoCall] ⚠️ High packet loss:', (lossRate * 100).toFixed(2) + '%');
      } else if (lossRate > 0.05) {
        setConnectionQuality('medium');
      } else {
        setConnectionQuality('good');
      }
    }, 2000);
    
    return () => clearInterval(monitorInterval);
  }, [isInCall]);

  const startCall = useCallback(async (targetUserId: string) => {
    try {
      if (targetUserId === userId) {
        toast({ title: 'Errore', description: 'Non puoi chiamare te stesso!', variant: 'destructive' });
        return;
      }

      // FIX #7: Use ideal/min constraints for cross-device compatibility
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          frameRate: { ideal: 30, min: 15 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
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

      // FIX #6: Monitor track ended events
      stream.getTracks().forEach(track => {
        track.onended = () => {
          console.error(`[useVideoCall] ⚠️ Track ended: ${track.kind}`);
          toast({ 
            title: 'Dispositivo disconnesso', 
            description: `Il ${track.kind === 'audio' ? 'microfono' : 'video'} è stato disconnesso`,
            variant: 'destructive' 
          });
          endCall();
        };
      });
      
      // FIX FASE 2: Delay 500ms per video rendering (Safari fix)
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        await new Promise(r => setTimeout(r, 500));
        await localVideoRef.current.play().catch(e => 
          console.warn('[useVideoCall] Local play blocked:', e)
        );
      }

      const pc = new WebRTCPeerConnection({
        onIceCandidate: (candidate) => {
          if (offerSentRef.current) {
            sendSignal({ type: 'ice-candidate', to: targetUserId, payload: candidate });
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
          // FIX FASE 2: Delay 500ms per video rendering (Safari fix)
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
            setTimeout(() => {
              remoteVideoRef.current?.play().catch(e => 
                console.warn('[useVideoCall] Remote play blocked:', e)
              );
            }, 500);
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

      // FIX #3: Process buffered ICE candidates
      for (const candidate of pendingIceCandidatesRef.current) {
        await pc.addIceCandidate(candidate);
      }
      pendingIceCandidatesRef.current = [];

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
          console.log('[useVideoCall] ⏱️ ICE gathering timeout (8s)');
          resolve();
        }, 8000);
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

      broadcastChannelRef.current = supabase.channel(`user-calls-${targetUserId}`);
      await broadcastChannelRef.current.subscribe();
      await broadcastChannelRef.current.send({
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
  }, [userId, sendSignal, toast, roomId]);

  const answerCall = useCallback(async (callerId: string) => {
    try {
      console.log('[useVideoCall] 📞 Answering call from:', callerId);
      
      setCallStatus('connecting');
      setRemotePeerId(callerId);
      
      // FIX FASE 2: Valida timestamp sessionStorage (10s max)
      const savedOffer = sessionStorage.getItem('pendingOffer');
      const savedOfferFrom = sessionStorage.getItem('pendingOfferFrom');
      const savedTimestamp = sessionStorage.getItem('pendingOfferTimestamp');
      
      if (savedOffer && !pendingOfferRef.current) {
        const isRecent = savedTimestamp && (Date.now() - parseInt(savedTimestamp)) < 10000;
        
        if (isRecent) {
          console.log('[useVideoCall] 📦 Recuperata offerta VALIDA da sessionStorage da:', savedOfferFrom);
          pendingOfferRef.current = { from: savedOfferFrom || callerId, offer: JSON.parse(savedOffer) };
        } else {
          console.warn('[useVideoCall] ⚠️ Offerta in sessionStorage troppo vecchia (>10s), ignorata');
        }
        
        sessionStorage.removeItem('pendingOffer');
        sessionStorage.removeItem('pendingOfferFrom');
        sessionStorage.removeItem('pendingOfferTimestamp');
        console.log('[useVideoCall] ✅ OFFER caricata e sessionStorage pulito');
      }
      
      // FIX #4: Timeout più lungo per reti lente (8 secondi invece di 3)
      console.log('[useVideoCall] ⏳ Waiting for pendingOffer...');
      let retries = 0;
      while (!pendingOfferRef.current && retries < 80) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
        
        if (retries % 10 === 0) {
          console.log(`[useVideoCall] ⏳ Still waiting... ${retries / 10}s elapsed`);
        }
      }
      
      if (!pendingOfferRef.current) {
        console.error('[useVideoCall] ❌ No pending offer after 8s');
        toast({ title: 'Errore', description: 'Offerta non ricevuta dopo 8 secondi', variant: 'destructive' });
        setCallStatus('idle');
        return;
      }
      
      console.log('[useVideoCall] ✅ OFFER ready, proceeding with answer...');
      
      // FIX #7: Use ideal/min constraints for cross-device compatibility
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          frameRate: { ideal: 30, min: 15 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
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

      // FIX #6: Monitor track ended events
      stream.getTracks().forEach(track => {
        track.onended = () => {
          console.error(`[useVideoCall] ⚠️ Track ended: ${track.kind}`);
          toast({ 
            title: 'Dispositivo disconnesso', 
            description: `Il ${track.kind === 'audio' ? 'microfono' : 'video'} è stato disconnesso`,
            variant: 'destructive' 
          });
          endCall();
        };
      });
      // FIX #7: Force play() on local video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        await localVideoRef.current.play().catch(e => 
          console.warn('[useVideoCall] Local play blocked (answering):', e)
        );
      }

      const pc = new WebRTCPeerConnection({
        onIceCandidate: (candidate) => {
          if (answerSentRef.current) {
            try {
              sendSignal({ type: 'ice-candidate', to: callerId, payload: candidate });
            } catch (error) {
              console.error('[useVideoCall] ❌ Error sending ICE candidate:', error);
            }
          } else {
            pendingIceCandidatesRef.current.push(candidate);
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
          // FIX #7: Force play() on remote video
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
            remoteVideoRef.current.play().catch(e => 
              console.warn('[useVideoCall] Remote play blocked (answering):', e)
            );
          }
          setIsInCall(true);
        },
        onConnectionStateChange: setConnectionState
      });

      // FIX #10: Correct RFC 8829 sequence - addLocalStream BEFORE setRemoteDescription
      peerConnectionRef.current = pc;
      setRemotePeerId(callerId);
      
      // 1️⃣ FIRST: Add local stream to peer connection
      await pc.addLocalStream(stream);

      // 2️⃣ THEN: Process buffered ICE candidates
      for (const candidate of pendingIceCandidatesRef.current) {
        await pc.addIceCandidate(candidate);
      }
      pendingIceCandidatesRef.current = [];

      // 3️⃣ FINALLY: Set remote description (AFTER local stream is added)
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
          console.log('[useVideoCall] ⏱️ ICE gathering timeout (8s)');
          resolve();
        }, 8000);
      });

      const answer = await pc.createAnswer();
      answerSentRef.current = true;
      
      try {
        await sendSignal({ type: 'answer', to: callerId, payload: answer });
        console.log('[useVideoCall] ✅ Answer sent');
        
        console.log('[useVideoCall] Sending', pendingIceCandidatesRef.current.length, 'buffered ICE candidates');
        for (const candidate of pendingIceCandidatesRef.current) {
          try {
            await sendSignal({ type: 'ice-candidate', to: callerId, payload: candidate });
          } catch (error) {
            console.error('[useVideoCall] ❌ Error sending buffered ICE candidate:', error);
          }
        }
        pendingIceCandidatesRef.current = [];
        
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

  // FIX #8: Implement replaceTrack() for quality switching
  const switchVideoQuality = useCallback(async (quality: 'low' | 'medium' | 'high') => {
    if (!localStreamRef.current || !peerConnectionRef.current) return;
    
    const constraints = {
      low: { width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 15 } },
      medium: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 } },
      high: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }
    };
    
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: constraints[quality],
        audio: false
      });
      
      const newVideoTrack = newStream.getVideoTracks()[0];
      const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
      
      const sender = peerConnectionRef.current.getSenders()
        .find(s => s.track?.kind === 'video');
      
      if (sender) {
        // FIX FASE 2: Stop vecchio track DOPO replaceTrack
        await sender.replaceTrack(newVideoTrack);
        oldVideoTrack?.stop();
        console.log('[useVideoCall] ✅ Video quality switched to:', quality);
      }
      if (sender) {
        await sender.replaceTrack(newVideoTrack);
        oldVideoTrack.stop();
        localStreamRef.current.removeTrack(oldVideoTrack);
        localStreamRef.current.addTrack(newVideoTrack);
        
        console.log(`[useVideoCall] ✅ Switched video quality to ${quality}`);
        toast({ title: 'Qualità video cambiata', description: `Ora: ${quality}` });
      }
    } catch (error) {
      console.error('[useVideoCall] ❌ Error switching quality:', error);
    }
  }, [toast]);

  const endCall = useCallback(async () => {
    console.log('[useVideoCall] 🔚 Ending call');
    
    if (remotePeerId) {
      try {
        await sendSignal({ type: 'call-end', to: remotePeerId, payload: {} });
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('[useVideoCall] ✅ Call-end signal sent');
      } catch (error) {
        console.error('[useVideoCall] ❌ Error sending call-end:', error);
      }
    }
    
    if (broadcastChannelRef.current) {
      await broadcastChannelRef.current.unsubscribe();
      await supabase.removeChannel(broadcastChannelRef.current);
      broadcastChannelRef.current = null;
      console.log('[useVideoCall] 🗑️ Broadcast channel cleaned up');
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
    answerSentRef.current = false;
    pendingIceCandidatesRef.current = [];
    
    console.log('[useVideoCall] ✅ Call cleanup complete');
  }, [remotePeerId, sendSignal, supabase]);

  return {
    isInCall,
    isMuted,
    isVideoOff,
    remotePeerId,
    connectionState,
    incomingCallFrom,
    callStatus,
    connectionQuality,
    localVideoRef,
    remoteVideoRef,
    startCall,
    answerCall,
    endCall,
    toggleMute,
    toggleVideo,
    switchVideoQuality
  };
};
