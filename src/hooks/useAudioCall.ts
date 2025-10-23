import { useState, useCallback, useRef, useEffect } from 'react';
import { WebRTCPeerConnection } from '@/utils/webrtc/PeerConnection';
import { useWebRTCSignaling } from './useWebRTCSignaling';
import { useToast } from './use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCallAnalytics } from './useCallAnalytics'; // FASE 3: Analytics

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
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const offerSentRef = useRef(false);

  const { toast } = useToast();
  const { sendSignal, setHandlers } = useWebRTCSignaling(roomId, userId);
  
  // FASE 3: Analytics tracking
  const analytics = useCallAnalytics({
    callType: 'audio',
    callerId: userId,
    calleeId: remotePeerId || '',
    roomId: roomId,
  });

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

  const endCall = useCallback(async () => {
    // FASE 3: End analytics tracking FIRST
    await analytics.endCall();
    
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
    
    // FIX 5 CRITICO: Reset refs chiamata
    offerSentRef.current = false;
    pendingIceCandidatesRef.current = [];
  }, [remotePeerId, sendSignal]);

  useEffect(() => {
    setHandlers({
      onOffer: async (offer, from) => {
        console.log('[useAudioCall] Received offer from:', from);
        pendingOfferRef.current = { from, offer };
        
        // Only set incomingCallFrom if not already in a call
        if (!isInCall && !incomingCallFrom) {
          setIncomingCallFrom(from);
          setRemotePeerId(from);
          
          toast({
            title: 'Chiamata in arrivo',
            description: 'Premi Rispondi per accettare'
          });
        } else {
          console.log('[useAudioCall] Ignoring duplicate offer - already in call or pending');
        }
      },
      onAnswer: async (answer) => {
        console.log('[useAudioCall] Received answer');
        
        const pc = peerConnectionRef.current;
        if (!pc) {
          console.error('[useAudioCall] ❌ No peer connection!');
          return;
        }
        
        // Check signaling state
        const signalingState = pc.getSignalingState();
        console.log('[useAudioCall] Signaling state:', signalingState);
        
        if (signalingState !== 'have-local-offer') {
          console.error('[useAudioCall] ❌ Cannot set remote description, wrong state:', signalingState);
          return;
        }
        
        // Wait for ICE gathering to complete
        await new Promise<void>((resolve) => {
          if (pc.getIceGatheringState() === 'complete') {
            console.log('[useAudioCall] ICE already complete');
            resolve();
            return;
          }
          
          console.log('[useAudioCall] Waiting for ICE gathering to complete...');
          const checkGathering = setInterval(() => {
            const state = pc.getIceGatheringState();
            console.log('[useAudioCall] ICE gathering state:', state);
            if (state === 'complete') {
              clearInterval(checkGathering);
              resolve();
            }
          }, 100);
          
          // Timeout after 3s
          setTimeout(() => {
            console.warn('[useAudioCall] ICE gathering timeout after 3s');
            clearInterval(checkGathering);
            resolve();
          }, 3000);
        });
        
        console.log('[useAudioCall] Setting remote description with answer');
        await pc?.setRemoteDescription(answer);
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
        
        // Verify state
        if (!pendingCallDataRef.current) {
          console.warn('[useAudioCall] ⚠️ Received ready but pendingCallDataRef is null');
          return;
        }
        
        if (pendingCallDataRef.current.targetUserId !== from) {
          console.warn('[useAudioCall] ⚠️ Ready from wrong user:', from, 'expected:', pendingCallDataRef.current.targetUserId);
          return;
        }
        
        // Bob is ready - Alice can send the offer now
        if (pendingCallDataRef.current && pendingCallDataRef.current.targetUserId === from) {
          const { targetUserId, stream, pc } = pendingCallDataRef.current;
          console.log('[useAudioCall] Sending offer to ready recipient:', targetUserId);
          
          await pc.addLocalStream(stream);
          
          // FIX 1 CRITICO: Aspetta che ICE gathering sia completo
          console.log('[useAudioCall] Waiting for ICE gathering to complete...');
          await new Promise<void>((resolve) => {
            const checkGathering = () => {
              const state = pc.getIceGatheringState();
              console.log('[useAudioCall] ICE gathering state:', state);
              
              if (state === 'complete') {
                console.log('[useAudioCall] ✅ ICE gathering complete');
                resolve();
              } else {
                // Ricontrolla ogni 100ms
                setTimeout(checkGathering, 100);
              }
            };
            
            // Avvia il check
            checkGathering();
            
            // Timeout dopo 5 secondi (fallback)
            setTimeout(() => {
              console.warn('[useAudioCall] ⚠️ ICE gathering timeout after 5s');
              resolve();
            }, 5000);
          });
          
          // Ora crea l'offer con TUTTI i candidates già inclusi
          const offer = await pc.createOffer();
          offerSentRef.current = true;
          
          await sendSignal({ type: 'offer', to: targetUserId, payload: offer });
          
          // Invia anche i candidates bufferizzati (se ce ne sono ancora)
          console.log('[useAudioCall] Sending buffered ICE candidates:', pendingIceCandidatesRef.current.length);
          pendingIceCandidatesRef.current.forEach(candidate => {
            sendSignal({ type: 'ice-candidate', to: targetUserId, payload: candidate });
          });
          pendingIceCandidatesRef.current = [];
          
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
      
      // FIX 6 CRITICO: Reset stato chiamata precedente
      offerSentRef.current = false;
      pendingIceCandidatesRef.current = [];
      
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
      
      // FASE 3: Start analytics tracking
      await analytics.startCall();
      
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

        // 🔔 Invia Push Notification
        try {
          const { data: senderProfile } = await supabase
            .from('user_profiles')
            .select('display_name')
            .eq('user_id', userId)
            .single();

          const { data: pushResult, error: pushError } = await supabase.functions.invoke('send-push-notification', {
            body: {
              userId: targetUserId,
              title: '📞 Chiamata in arrivo',
              body: `${senderProfile?.display_name || 'Qualcuno'} ti sta chiamando`,
              url: `/call-room?acceptedCall=true&incomingFrom=${userId}`,
              callId: userId,
              roomId: targetUserId
            }
          });

          if (pushError) {
            console.warn('[startCall] ⚠️ Push notification failed:', pushError);
          } else {
            console.log('[startCall] ✅ Push notification sent:', pushResult);
          }
        } catch (pushError) {
          console.warn('[startCall] ⚠️ Push notification error:', pushError);
        }
        
        // Lascia aperto il canale per 5 secondi prima di chiuderlo (aumentato per affidabilità)
        setTimeout(() => {
          channel.unsubscribe();
        }, 5000);
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

      // FIX FASE 1: Imposta remotePeerId PRIMA di creare PeerConnection
      if (targetUserId) setRemotePeerId(targetUserId);
      
      const pc = new WebRTCPeerConnection({
      onIceCandidate: (candidate) => {
        // FASE 3: Track ICE candidates
        analytics.incrementIceCandidates();
        
        // Use remotePeerId as fallback after pendingCallDataRef is cleared
        const targetUser = pendingCallDataRef.current?.targetUserId || remotePeerId;
        
        if (offerSentRef.current && targetUser) {
          console.log('[useAudioCall] Sending ICE candidate to:', targetUser);
          sendSignal({ type: 'ice-candidate', to: targetUser, payload: candidate });
        } else {
          pendingIceCandidatesRef.current.push(candidate);
          console.log('[useAudioCall] Buffered ICE candidate, total:', pendingIceCandidatesRef.current.length);
        }
      },
        onRemoteStream: (stream) => {
          console.log('[useAudioCall] Received remote stream');
          remoteStreamRef.current = stream;
          
          // STEP 2: Verifica tracce audio attive
          const audioTracks = stream.getAudioTracks();
          console.log('[useAudioCall] Remote audio tracks:', audioTracks.length);
          
          if (audioTracks.length === 0) {
            console.error('[useAudioCall] ❌ No audio tracks in remote stream!');
            toast({
              title: 'Errore Audio',
              description: 'Lo stream remoto non contiene audio',
              variant: 'destructive'
            });
            return;
          }
          
          audioTracks.forEach((track, index) => {
            console.log(`[useAudioCall] Track ${index}:`, {
              id: track.id,
              kind: track.kind,
              enabled: track.enabled,
              muted: track.muted,
              readyState: track.readyState
            });
          });
          
          // Aspetta che il ref sia pronto prima di assegnare lo stream
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = stream;
            remoteAudioRef.current.volume = 1.0; // Volume massimo
            
            remoteAudioRef.current.play().catch(err => {
              console.error('[useAudioCall] Audio play error:', err);
              
              // Su mobile, potrebbe essere necessaria interazione utente
              toast({
                title: 'Clicca per attivare audio',
                description: 'Il browser richiede interazione utente'
              });
            });
          } else {
            console.warn('[useAudioCall] remoteAudioRef not ready yet');
          }
          
          setIsInCall(true);
        },
        onConnectionStateChange: (state) => {
          console.log('[useAudioCall] Connection state changed:', state);
          setConnectionState(state);
          
          // FASE 3: Track connection status
          if (state === 'connected') {
            analytics.updateStatus('connected');
          } else if (state === 'failed' || state === 'disconnected') {
            analytics.updateStatus('failed', `Connection ${state}`);
          }
        }
      });

      peerConnectionRef.current = pc;
      // FIX #3: Non chiamare setIsInCall(true) qui - viene chiamato solo in onRemoteStream

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
      
      // FIX FASE 1: Gestione errori getUserMedia specifica
      let message = 'Errore';
      let description = 'Impossibile avviare la chiamata';
      
      if (error.name === 'NotAllowedError') {
        message = 'Permessi microfono negati';
        description = 'Consenti l\'accesso al microfono nelle impostazioni del browser';
      } else if (error.name === 'NotReadableError') {
        message = 'Microfono già in uso';
        description = 'Chiudi altre applicazioni che stanno usando il microfono';
      } else if (error.name === 'NotFoundError') {
        message = 'Microfono non trovato';
        description = 'Collega un microfono e riprova';
      } else if (error.name === 'OverconstrainedError') {
        message = 'Impostazioni non supportate';
        description = 'Il microfono non supporta le impostazioni richieste';
      }
      
      toast({
        title: message,
        description,
        variant: 'destructive'
      });
      
      // FASE 3: Track failed call
      await analytics.updateStatus('failed', `${message}: ${description}`);
      await analytics.endCall(0);
      
      setWaitingForRecipient(null);
    }
  }, [sendSignal, toast, monitorNetworkQuality, waitingForRecipient, analytics]);

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  }, []);

  const answerCall = useCallback(async (forcedCallerId?: string) => {
    console.log('[answerCall] 🟢 STARTING');
    
    // ✅ Usa il callerId forzato se fornito, altrimenti usa lo stato
    const callerId = forcedCallerId || incomingCallFrom;
    
    console.log('[answerCall] 📊 Current state:', { 
      incomingCallFrom, 
      forcedCallerId,
      finalCallerId: callerId,
      isInCall, 
      hasPendingOffer: !!pendingOfferRef.current 
    });
    
    // FIX #1: NON controllare pendingOfferRef qui - l'offer arriverà DOPO il ready
    if (!callerId) {
      console.error('[answerCall] ❌ No incoming call and no forced caller ID!');
      toast({
        title: 'Errore',
        description: 'Nessuna chiamata in attesa',
        variant: 'destructive'
      });
      return;
    }

    const from = callerId;
    console.log('[answerCall] ✅ Answering call from:', from);

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
          
          const audioTracks = stream.getAudioTracks();
          console.log('[answerCall] Remote audio tracks:', audioTracks.length);
          
          if (audioTracks.length === 0) {
            console.error('[answerCall] ❌ No audio tracks in remote stream!');
            return;
          }
          
          audioTracks.forEach((track, index) => {
            console.log(`[answerCall] Track ${index}:`, {
              id: track.id,
              enabled: track.enabled,
              muted: track.muted,
              readyState: track.readyState
            });
          });
          
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = stream;
            remoteAudioRef.current.volume = 1.0;
            
            remoteAudioRef.current.play().catch(err => {
              console.error('[answerCall] Audio play error:', err);
              toast({
                title: 'Clicca per attivare audio',
                description: 'Il browser richiede interazione utente'
              });
            });
          }
          
          // FIX #1 & #3: Setta isInCall SOLO qui quando arriva lo stream remoto
          setIsInCall(true);
        },
        onConnectionStateChange: setConnectionState
      });

      peerConnectionRef.current = pc;
      setRemotePeerId(from);  // FIX #1: Setta remotePeerId per permettere signaling futuro
      
      await pc.addLocalStream(stream);
      
      // FIX #1 CRITICO: Invia READY ad Alice SUBITO (prima di setRemoteDescription)
      console.log('[answerCall] 🟢 Sending READY signal to Alice');
      await sendSignal({ type: 'ready', to: from, payload: {} });
      
      // FIX #1 CRITICO: ASPETTA l'offer da Alice
      console.log('[answerCall] ⏳ Waiting for offer from Alice...');
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout waiting for offer'));
        }, 10000);  // 10 secondi timeout
        
        const checkOffer = setInterval(() => {
          if (pendingOfferRef.current && pendingOfferRef.current.from === from) {
            clearInterval(checkOffer);
            clearTimeout(timeout);
            resolve();
          }
        }, 100);
      });
      
    const offer = pendingOfferRef.current!.offer;
    
    // Wait for Alice's candidates BEFORE setRemoteDescription
    console.log('[answerCall] Waiting 2000ms for Alice\'s ICE candidates...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('[answerCall] ✅ Setting remote description with offer');
    await pc.setRemoteDescription(offer);
    
    // Create answer
    const answer = await pc.createAnswer();
    console.log('[answerCall] Answer created, SDP length:', answer.sdp?.length || 0);
    console.log('[answerCall] Answer SDP preview:', answer.sdp?.substring(0, 150));
      
      await sendSignal({ type: 'answer', to: from, payload: answer });

      setIncomingCallFrom(null);
      pendingOfferRef.current = null;

      statsIntervalRef.current = setInterval(monitorNetworkQuality, 5000);

      // Riprova autoplay
      if (remoteAudioRef.current && remoteStreamRef.current) {
        try {
          await remoteAudioRef.current.play();
          console.log('[answerCall] Audio playback started');
        } catch (e) {
          console.warn('[answerCall] Autoplay blocked, user interaction needed');
        }
      }

      console.log('[answerCall] ✅ COMPLETED - WebRTC connection established');
      
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
  }, [sendSignal, toast, monitorNetworkQuality, incomingCallFrom]);

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
