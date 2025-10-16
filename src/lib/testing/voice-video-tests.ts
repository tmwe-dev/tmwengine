import type { Test, TestSuite } from './test-types';

// Test comunicazione voce
const voiceTests: Test[] = [
  {
    name: "Setup audio stream",
    description: "Tempo setup audio stream con configurazione ottimale",
    expected_time_ms: 300,
    test: async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: 24000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true
          }
        });
        
        const tracks = stream.getTracks();
        const settings = tracks[0]?.getSettings();
        
        stream.getTracks().forEach(t => t.stop());
        
        return { 
          success: true, 
          tracks: tracks.length,
          settings
        };
      } catch (error) {
        throw new Error(`Audio stream failed: ${error}`);
      }
    }
  },
  {
    name: "Check audio constraints support",
    description: "Verifica supporto constraint audio",
    expected_time_ms: 100,
    test: async () => {
      const constraints = {
        sampleRate: 24000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      };
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: constraints });
        const track = stream.getAudioTracks()[0];
        const settings = track.getSettings();
        const capabilities = track.getCapabilities ? track.getCapabilities() : {};
        
        stream.getTracks().forEach(t => t.stop());
        
        return {
          supported: true,
          settings,
          capabilities
        };
      } catch (error) {
        return {
          supported: false,
          error: String(error)
        };
      }
    }
  }
];

// Test preparazione video
const videoPreparationTests: Test[] = [
  {
    name: "Check camera availability",
    description: "Verifica disponibilità camera",
    expected_time_ms: 200,
    test: async () => {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(d => d.kind === 'videoinput');
      
      return {
        available: cameras.length > 0,
        count: cameras.length,
        devices: cameras.map(c => ({ 
          label: c.label, 
          deviceId: c.deviceId 
        }))
      };
    }
  },
  {
    name: "Setup video stream (720p)",
    description: "Tempo setup video 720p",
    expected_time_ms: 500,
    test: async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          },
          audio: true
        });
        
        const videoTrack = stream.getVideoTracks()[0];
        const settings = videoTrack?.getSettings();
        
        stream.getTracks().forEach(t => t.stop());
        
        return {
          success: true,
          resolution: `${settings?.width}x${settings?.height}`,
          frameRate: settings?.frameRate,
          settings
        };
      } catch (error) {
        throw new Error(`Video stream failed: ${error}`);
      }
    }
  },
  {
    name: "Test multiple resolutions",
    description: "Verifica supporto risoluzioni multiple",
    expected_time_ms: 1000,
    test: async () => {
      const resolutions = [
        { width: 640, height: 480, label: '480p' },
        { width: 1280, height: 720, label: '720p' },
        { width: 1920, height: 1080, label: '1080p' }
      ];
      
      const results = [];
      
      for (const res of resolutions) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: res.width },
              height: { ideal: res.height }
            }
          });
          
          const track = stream.getVideoTracks()[0];
          const settings = track?.getSettings();
          stream.getTracks().forEach(t => t.stop());
          
          results.push({
            label: res.label,
            supported: true,
            actual: `${settings?.width}x${settings?.height}`
          });
        } catch {
          results.push({
            label: res.label,
            supported: false
          });
        }
      }
      
      return { resolutions: results };
    }
  }
];

// Test WebRTC
const webrtcTests: Test[] = [
  {
    name: "Create RTCPeerConnection",
    description: "Tempo setup peer connection",
    expected_time_ms: 100,
    test: async () => {
      try {
        const pc = new RTCPeerConnection();
        const state = pc.connectionState;
        pc.close();
        
        return {
          success: true,
          initialState: state
        };
      } catch (error) {
        throw new Error(`RTCPeerConnection failed: ${error}`);
      }
    }
  },
  {
    name: "Create offer/answer",
    description: "Performance SDP negotiation",
    expected_time_ms: 200,
    test: async () => {
      const pc = new RTCPeerConnection();
      
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        const result = {
          success: true,
          sdpType: offer.type,
          sdpLength: offer.sdp?.length || 0
        };
        
        pc.close();
        return result;
      } catch (error) {
        pc.close();
        throw new Error(`SDP negotiation failed: ${error}`);
      }
    }
  }
];

export const voiceVideoTestSuites: TestSuite[] = [
  {
    name: "Voice Communication",
    description: "Test sistema comunicazione voce",
    category: 'voice-video',
    tests: voiceTests
  },
  {
    name: "Video Preparation",
    description: "Test preparazione sistema video",
    category: 'voice-video',
    tests: videoPreparationTests
  },
  {
    name: "WebRTC Diagnostics",
    description: "Test connessioni WebRTC",
    category: 'voice-video',
    tests: webrtcTests
  }
];
