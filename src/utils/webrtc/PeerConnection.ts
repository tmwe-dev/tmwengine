export class WebRTCPeerConnection {
  private pc: RTCPeerConnection;
  private localStream?: MediaStream;
  private onRemoteStream?: (stream: MediaStream) => void;
  private onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  private pendingCandidates: RTCIceCandidateInit[] = [];

  constructor(config: {
    iceServers?: RTCIceServer[];
    onIceCandidate?: (candidate: RTCIceCandidate) => void;
    onRemoteStream?: (stream: MediaStream) => void;
    onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  }) {
    const defaultIceServers = [
      { urls: ['stun:stun.l.google.com:19302'] },
      { urls: ['stun:stun1.l.google.com:19302'] },
    ];

    this.pc = new RTCPeerConnection({
      iceServers: config.iceServers || defaultIceServers,
    });

    this.onRemoteStream = config.onRemoteStream;
    this.onConnectionStateChange = config.onConnectionStateChange;

    this.pc.onicecandidate = (event) => {
      if (event.candidate && config.onIceCandidate) {
        config.onIceCandidate(event.candidate);
      }
    };

    this.pc.ontrack = (event) => {
      if (event.streams[0] && this.onRemoteStream) {
        this.onRemoteStream(event.streams[0]);
      }
    };

    this.pc.onconnectionstatechange = () => {
      console.log('[PeerConnection] Connection state:', this.pc.connectionState);
      
      if (this.pc.connectionState === 'failed') {
        console.error('[PeerConnection] ❌ Connection failed - attempting restart');
        this.pc.restartIce();
      }
      
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(this.pc.connectionState);
      }
    };

    // STEP 1C: Monitor ICE connection state
    this.pc.oniceconnectionstatechange = () => {
      console.log('[PeerConnection] ICE connection state:', this.pc.iceConnectionState);
      
      if (this.pc.iceConnectionState === 'failed') {
        console.error('[PeerConnection] ❌ ICE connection failed - attempting restart');
        this.pc.restartIce();
      }
    };

    this.pc.onicegatheringstatechange = () => {
      console.log('[PeerConnection] ICE gathering state:', this.pc.iceGatheringState);
    };
  }

  async addLocalStream(stream: MediaStream) {
    this.localStream = stream;
    stream.getTracks().forEach(track => {
      this.pc.addTrack(track, stream);
    });
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    return offer;
  }

  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  async setRemoteDescription(sdp: RTCSessionDescriptionInit) {
    console.log('[PeerConnection] Setting remote description, type:', sdp.type);
    await this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
    
    // Add buffered candidates after remote description is set
    console.log('[PeerConnection] Adding', this.pendingCandidates.length, 'buffered candidates');
    for (const candidate of this.pendingCandidates) {
      await this.addIceCandidate(candidate);
    }
    this.pendingCandidates = [];
  }

  async setLocalDescription(sdp: RTCSessionDescriptionInit) {
    await this.pc.setLocalDescription(new RTCSessionDescription(sdp));
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    try {
      if (!this.pc.remoteDescription) {
        console.warn('[PeerConnection] Buffering candidate - no remote description yet');
        this.pendingCandidates.push(candidate);
        return;
      }
      
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
      console.log('[PeerConnection] ✅ ICE candidate added');
    } catch (error) {
      console.error('[PeerConnection] ❌ Error adding ICE candidate:', error);
    }
  }

  getStats(): Promise<RTCStatsReport> {
    return this.pc.getStats();
  }

  getIceGatheringState(): RTCIceGatheringState {
    return this.pc.iceGatheringState;
  }

  getIceConnectionState(): RTCIceConnectionState {
    return this.pc.iceConnectionState;
  }

  getSignalingState(): RTCSignalingState {
    return this.pc.signalingState;
  }

  close() {
    if (this.pc.connectionState !== 'closed') {
      console.log('[PeerConnection] Closing connection');
      
      this.pc.onicecandidate = null;
      this.pc.ontrack = null;
      this.pc.onconnectionstatechange = null;
      this.pc.oniceconnectionstatechange = null;
      this.pc.onicegatheringstatechange = null;
      
      this.localStream?.getTracks().forEach(track => track.stop());
      this.pc.close();
    } else {
      console.log('[PeerConnection] Connection already closed');
    }
  }
}
