import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export const VoiceAgentWidget = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState<{
    agentId: string;
    enabled: boolean;
  } | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const savedConfig = localStorage.getItem('voice_agent_config');
    if (savedConfig) {
      try {
        setConfig(JSON.parse(savedConfig));
      } catch (error) {
        console.error('Error loading config:', error);
      }
    }
  }, []);

  const playAudioChunk = async (audioBuffer: ArrayBuffer) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
    }

    try {
      const decodedBuffer = await audioContextRef.current.decodeAudioData(audioBuffer);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = decodedBuffer;
      source.connect(audioContextRef.current.destination);
      
      source.onended = () => {
        if (audioQueueRef.current.length > 0) {
          const nextChunk = audioQueueRef.current.shift()!;
          playAudioChunk(nextChunk);
        } else {
          isPlayingRef.current = false;
          setIsSpeaking(false);
        }
      };
      
      source.start();
    } catch (error) {
      console.error('Error playing audio:', error);
      isPlayingRef.current = false;
      setIsSpeaking(false);
    }
  };

  const processAudioQueue = () => {
    if (!isPlayingRef.current && audioQueueRef.current.length > 0) {
      isPlayingRef.current = true;
      setIsSpeaking(true);
      const chunk = audioQueueRef.current.shift()!;
      playAudioChunk(chunk);
    }
  };

  const handleStartConversation = async () => {
    if (!config?.agentId) {
      toast({
        title: 'Configurazione mancante',
        description: 'Configura l\'Agent ID nelle impostazioni.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Richiedi permesso microfono
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      mediaStreamRef.current = stream;

      console.log('Ottengo signed URL per agentId:', config.agentId);

      // Chiamata diretta all'API pubblica di ElevenLabs
      const response = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${config.agentId}`
      );

      if (!response.ok) {
        throw new Error('Impossibile ottenere signed URL');
      }

      const data = await response.json();
      const ws = new WebSocket(data.signed_url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connesso');
        setIsConnected(true);
        toast({
          title: 'Connesso',
          description: 'Agente vocale attivo.',
        });
      };

      ws.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'audio' && message.audio_event) {
            const audioData = atob(message.audio_event.audio);
            const arrayBuffer = new ArrayBuffer(audioData.length);
            const view = new Uint8Array(arrayBuffer);
            for (let i = 0; i < audioData.length; i++) {
              view[i] = audioData.charCodeAt(i);
            }
            audioQueueRef.current.push(arrayBuffer);
            processAudioQueue();
          }
        } catch (error) {
          console.error('Error processing message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast({
          title: 'Errore',
          description: 'Errore di connessione.',
          variant: 'destructive',
        });
      };

      ws.onclose = () => {
        console.log('WebSocket chiuso');
        setIsConnected(false);
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
          mediaStreamRef.current = null;
        }
      };

      // Setup audio input
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        if (ws.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          const int16Array = new Int16Array(inputData.length);
          
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }

          const base64Audio = btoa(String.fromCharCode(...new Uint8Array(int16Array.buffer)));
          ws.send(JSON.stringify({
            user_audio_chunk: base64Audio
          }));
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

    } catch (error) {
      console.error('Error starting conversation:', error);
      toast({
        title: 'Errore',
        description: error instanceof Error ? error.message : 'Impossibile avviare la conversazione',
        variant: 'destructive',
      });
    }
  };

  const handleEndConversation = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setIsConnected(false);
    setIsSpeaking(false);
  };

  if (!config?.enabled) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="flex flex-col items-end gap-3">
        {isConnected && (
          <div className="bg-card border border-border rounded-lg px-4 py-2 shadow-lg">
            <div className="flex items-center gap-2">
              <div className={cn(
                'w-3 h-3 rounded-full',
                isSpeaking ? 'bg-green-500 animate-pulse' : 'bg-muted'
              )} />
              <span className="text-sm text-muted-foreground">
                {isSpeaking ? 'In ascolto...' : 'Pronto'}
              </span>
            </div>
          </div>
        )}

        {!isConnected ? (
          <Button
            onClick={handleStartConversation}
            size="lg"
            className="rounded-full h-16 w-16 shadow-lg"
          >
            <Phone className="h-6 w-6" />
          </Button>
        ) : (
          <Button
            onClick={handleEndConversation}
            size="lg"
            variant="destructive"
            className="rounded-full h-16 w-16 shadow-lg"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        )}
      </div>
    </div>
  );
};
